<?php
/* Shared by checkout.php and stripe-webhook.php. Written for PHP 7.4, the oldest version a GoDaddy
 * cPanel still offers, because the client's host version is not known.
 *
 * THE SECRETS ARE NOT IN THIS FOLDER. They live in cdr-config.php ONE DIRECTORY ABOVE the site's
 * document root (on cPanel: beside public_html, never inside it), where no browser can request
 * it. The paid orders are written beside it for the same reason. cpanel/cdr-config.sample.php is
 * the template the client fills in.
 *
 * This file sits in api/lib/, which .htaccess forbids to browsers; PHP reads it from disk.
 */

function cdr_config() {
    static $config = null;
    if ($config !== null) return $config;
    $path = dirname($_SERVER['DOCUMENT_ROOT']) . '/cdr-config.php';
    if (!is_file($path)) cdr_fail(503, 'not_configured', 'The payment configuration file is missing.');
    $c = require $path;
    if (!is_array($c) || empty($c['stripe_secret_key']) || empty($c['site_url']) || empty($c['notify_email'])) {
        cdr_fail(503, 'not_configured', 'The payment configuration file is incomplete.');
    }
    $c += array(
        'stripe_webhook_secret' => '',
        'orders_dir' => dirname($_SERVER['DOCUMENT_ROOT']) . '/cdr-orders',
        'from_email' => 'no-reply@' . parse_url($c['site_url'], PHP_URL_HOST),
        'mail_transport' => 'mail',
    );
    $c['site_url'] = rtrim($c['site_url'], '/');
    $config = $c;
    return $config;
}

/** True when the configured Stripe key is a test key: every email and record says so. */
function cdr_test_mode() {
    return strpos(cdr_config()['stripe_secret_key'], 'sk_test_') === 0;
}

function cdr_catalog() {
    static $catalog = null;
    if ($catalog === null) $catalog = json_decode(file_get_contents(__DIR__ . '/catalog.json'), true);
    return $catalog;
}

function cdr_json($status, $body) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function cdr_fail($status, $code, $message, $extra = array()) {
    cdr_json($status, array('error' => $code, 'message' => $message) + $extra);
}

/* ---------- orders: one JSON file each, above the document root ---------- */

function cdr_orders_dir() {
    $dir = cdr_config()['orders_dir'];
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0700, true)) cdr_fail(500, 'storage', 'The order store could not be created.');
        // Belt and braces: if a host ever puts this folder under the web root, Apache still refuses it.
        file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
    }
    return $dir;
}

function cdr_valid_order_id($id) {
    return is_string($id) && preg_match('/^\d{8}-[a-f0-9]{10}$/', $id);
}

function cdr_new_order_id() {
    return gmdate('Ymd') . '-' . bin2hex(random_bytes(5));
}

function cdr_order_path($id) {
    if (!cdr_valid_order_id($id)) return null;
    return cdr_orders_dir() . '/' . $id . '.json';
}

function cdr_write_order($order) {
    $path = cdr_order_path($order['id']);
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($order, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    @chmod($tmp, 0600);
    rename($tmp, $path);
}

/** Reads, changes and writes one order under an exclusive lock, so two webhook deliveries of the
 *  same event cannot both act on it. $change returns the new order, or null to leave it alone. */
function cdr_update_order($id, $change) {
    $path = cdr_order_path($id);
    if (!$path || !is_file($path)) return null;
    $lock = fopen($path . '.lock', 'c');
    flock($lock, LOCK_EX);
    $order = json_decode(file_get_contents($path), true);
    $next = $change($order);
    if ($next !== null) cdr_write_order($next);
    flock($lock, LOCK_UN);
    fclose($lock);
    return $next !== null ? $next : $order;
}

/* ---------- mail ---------- */

/** Sends a plain-text email. On the host this is PHP's mail(), which cPanel wires to its own
 *  mail server. 'file' writes the message into the order store's outbox instead, for local proof,
 *  where no mail server exists. */
function cdr_mail($to, $subject, $body) {
    $c = cdr_config();
    $headers = 'From: ' . $c['from_email'] . "\r\n" . "Content-Type: text/plain; charset=utf-8\r\n";
    if ($c['mail_transport'] === 'file') {
        $dir = cdr_orders_dir() . '/outbox';
        if (!is_dir($dir)) mkdir($dir, 0700, true);
        file_put_contents($dir . '/' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.eml', $headers . 'To: ' . $to . "\r\nSubject: " . $subject . "\r\n\r\n" . $body);
        return true;
    }
    return mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

/* ---------- Stripe, over plain HTTPS: no SDK, so nothing to install on the host ---------- */

function cdr_stripe($method, $path, $params = array(), $idempotencyKey = null) {
    $ch = curl_init('https://api.stripe.com/v1' . $path);
    $headers = array('Authorization: Bearer ' . cdr_config()['stripe_secret_key'], 'Stripe-Version: 2024-06-20');
    if ($idempotencyKey) $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ));
    if ($method === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = is_string($raw) ? json_decode($raw, true) : null;
    return array($status, $body);
}

/** Verifies a Stripe-Signature header: HMAC-SHA256 of "timestamp.payload" with the endpoint's
 *  signing secret, compared in constant time, and refused if older than five minutes so a
 *  captured delivery cannot be replayed. */
function cdr_stripe_signature_ok($payload, $header, $secret, $tolerance = 300) {
    if (!$header || !$secret) return false;
    $t = null;
    $sigs = array();
    foreach (explode(',', $header) as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) !== 2) continue;
        if ($kv[0] === 't') $t = $kv[1];
        if ($kv[0] === 'v1') $sigs[] = $kv[1];
    }
    if (!$t || !ctype_digit($t) || !$sigs || abs(time() - (int) $t) > $tolerance) return false;
    $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
    foreach ($sigs as $s) if (hash_equals($expected, $s)) return true;
    return false;
}

function cdr_money($cents) {
    return '$' . number_format($cents / 100, 2) . ' USD';
}
