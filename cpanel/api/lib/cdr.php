<?php
/* Shared by every script under api/. Plain PHP (7.4 or later), curl and openssl only: the host
 * has neither sodium nor simplexml.
 *
 * THE SECRETS ARE NOT IN THIS FOLDER. They live in cdr-config.php ONE DIRECTORY ABOVE the site's
 * document root (on cPanel: beside public_html, never inside it), where no browser can request
 * it. The orders are written beside it for the same reason. cpanel/cdr-config.sample.php is the
 * template.
 *
 * This file sits in api/lib/, which .htaccess forbids to browsers; PHP reads it from disk.
 */

/** The folder that holds public_html (or out/ locally): where cdr-config.php and cdr-orders/ live.
 *  Taken from this file's own path so the cron job, which runs without a web server, finds it too. */
function cdr_home() {
    return dirname(__DIR__, 3);
}

function cdr_config() {
    static $config = null;
    if ($config !== null) return $config;
    $path = cdr_home() . '/cdr-config.php';
    if (!is_file($path)) cdr_fail(503, 'not_configured', 'The shop configuration file is missing.');
    $c = require $path;
    if (!is_array($c)) cdr_fail(503, 'not_configured', 'The shop configuration file is unreadable.');
    $c += array(
        'stripe_secret_key' => '',
        'stripe_webhook_secret' => '',
        'site_url' => '',
        'notify_email' => '',
        'orders_dir' => cdr_home() . '/cdr-orders',
        'from_email' => '',
        'mail_transport' => 'mail',
        'resend_api_key' => '',
        'opensrs_env' => 'test',
        'opensrs_username' => '',
        'opensrs_api_key' => '',
        'opensrs_nameservers' => array(),
        'cad_rate' => 1,
        'admin_token' => '',
        'order_secret' => '',
        'cron_token' => '',
        // Local tests only: point the scripts at a stand-in for Tucows or Stripe.
        'opensrs_url' => '',
        'stripe_api' => 'https://api.stripe.com/v1',
    );
    // A value still holding the sample's placeholder counts as missing.
    foreach ($c as $k => $v) if (is_string($v) && strpos($v, 'PASTE') !== false) $c[$k] = '';
    $c['site_url'] = rtrim($c['site_url'], '/');
    if ($c['from_email'] === '' && $c['site_url'] !== '') $c['from_email'] = 'no-reply@' . preg_replace('/^www\./', '', parse_url($c['site_url'], PHP_URL_HOST));
    $c['opensrs_env'] = $c['opensrs_env'] === 'live' ? 'live' : 'test';
    $config = $c;
    return $config;
}

/** Stops with a 503 unless every named setting is filled in. */
function cdr_require_config($keys) {
    $c = cdr_config();
    foreach ($keys as $k) {
        if (empty($c[$k])) cdr_fail(503, 'not_configured', 'The shop is not fully configured yet.');
    }
    return $c;
}

/** True when the configured Stripe key is a test key: every email and record says so. */
function cdr_test_mode() {
    return strpos(cdr_config()['stripe_secret_key'], 'sk_live_') !== 0;
}

function cdr_catalog() {
    static $catalog = null;
    if ($catalog === null) $catalog = json_decode(file_get_contents(__DIR__ . '/catalog.json'), true);
    return $catalog;
}

function cdr_json($status, $body) {
    if (PHP_SAPI === 'cli') {
        echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), "\n";
        exit($status >= 400 ? 1 : 0);
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function cdr_fail($status, $code, $message, $extra = array()) {
    cdr_json($status, array('error' => $code, 'message' => $message) + $extra);
}

/** Sends what has been echoed so far and closes the connection, so the script can keep working
 *  (registering a domain can take longer than Stripe or a browser should wait). Where the server
 *  offers no way to do that (PHP's built-in server), the work simply happens before the reply. */
function cdr_finish_request() {
    ignore_user_abort(true);
    @set_time_limit(300);
    if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); return; }
    if (function_exists('litespeed_finish_request')) { litespeed_finish_request(); return; }
    while (ob_get_level() > 0) ob_end_flush();
    flush();
}

/** cdr_json() for a reply after which the script continues. */
function cdr_json_then_continue($status, $body) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    $out = json_encode($body, JSON_UNESCAPED_SLASHES);
    header('Content-Length: ' . strlen($out));
    header('Connection: close');
    echo $out;
    cdr_finish_request();
}

/* ---------- the visitor: where they are, and what currency that means ---------- */

function cdr_visitor_ip() {
    // Behind a proxy or CDN the visitor is the FIRST entry of x-forwarded-for; GoDaddy's shared
    // hosting normally has no proxy in front, so REMOTE_ADDR is the visitor. A forwarded header is
    // visitor-controlled text: accept only a public address from it.
    $candidates = array();
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) $candidates[] = $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $candidates[] = trim($parts[0]);
    }
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) $candidates[] = $_SERVER['HTTP_X_REAL_IP'];
    if (!empty($_SERVER['REMOTE_ADDR'])) $candidates[] = $_SERVER['REMOTE_ADDR'];
    foreach ($candidates as $c) {
        if (filter_var($c, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return $c;
    }
    $last = end($candidates);
    return ($last && filter_var($last, FILTER_VALIDATE_IP)) ? $last : null;
}

/** The visitor's country (ISO two letters) from the IP database beside geo.php, or null. */
function cdr_visitor_country() {
    $ip = cdr_visitor_ip();
    $db = dirname(__DIR__) . '/geo/dbip-city-lite.mmdb';
    if (!$ip || !is_readable($db)) return null;
    try {
        require_once __DIR__ . '/MaxMind/Db/Reader.php';
        require_once __DIR__ . '/MaxMind/Db/Reader/Decoder.php';
        require_once __DIR__ . '/MaxMind/Db/Reader/InvalidDatabaseException.php';
        require_once __DIR__ . '/MaxMind/Db/Reader/Metadata.php';
        require_once __DIR__ . '/MaxMind/Db/Reader/Util.php';
        $reader = new \MaxMind\Db\Reader($db);
        $rec = $reader->get($ip);
        $reader->close();
        return is_array($rec) && !empty($rec['country']['iso_code']) ? strtoupper($rec['country']['iso_code']) : null;
    } catch (\Throwable $e) {
        return null;
    }
}

/** Canada pays in CAD, everyone else in USD: the same rule as the header chip
 *  (src/data/regions.ts), decided from the same IP database, so the page and the charge agree. */
function cdr_visitor_currency() {
    return cdr_visitor_country() === 'CA' ? 'cad' : 'usd';
}

/** A term's price in cents in the given currency. CAD is the USD ladder times cad_rate, which the
 *  client set to 1 ("dollar for dollar", 28 Sep 2026). */
function cdr_price_cents($term, $currency) {
    $ladder = cdr_catalog()['ladder'];
    if (!isset($ladder[(string) $term])) return null;
    $rate = $currency === 'cad' ? (float) cdr_config()['cad_rate'] : 1.0;
    return (int) round($ladder[(string) $term] * $rate * 100);
}

function cdr_money($cents, $currency = 'usd') {
    return '$' . number_format($cents / 100, 2) . ' ' . strtoupper($currency);
}

/* ---------- domains ---------- */

function cdr_normalise_domain($raw) {
    $d = strtolower(trim((string) $raw));
    $d = preg_replace('#^[a-z]+://#', '', $d);
    $d = preg_replace('#[/?\#].*$#', '', $d);
    $d = preg_replace('/^www\./', '', $d);
    return rtrim($d, '.');
}

/** Shaped like a domain name: labels of letters, digits and inner hyphens (punycode included),
 *  an extension of letters. Whether it can be SOLD is cdr_sellable(). */
function cdr_valid_domain($domain) {
    return strlen($domain) <= 253
        && preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/', $domain);
}

function cdr_tld($domain) {
    return substr($domain, strrpos($domain, '.') + 1);
}

/** A second-level name (one label, one extension) on an extension sold online (catalog.json
 *  "sellable", plan D6). Hyphens in the third and fourth places are reserved for punycode. */
function cdr_sellable($domain) {
    return substr_count($domain, '.') === 1
        && in_array(cdr_tld($domain), cdr_catalog()['sellable'], true)
        && (substr($domain, 2, 2) !== '--' || substr($domain, 0, 4) === 'xn--');
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

/** The token that lets the customer's browser read its own order's progress, and nobody else's. */
function cdr_order_token($id) {
    $c = cdr_config();
    $secret = $c['order_secret'] !== '' ? $c['order_secret'] : hash('sha256', 'cdr-order|' . $c['stripe_secret_key'] . '|' . $c['stripe_webhook_secret']);
    return substr(hash_hmac('sha256', $id, $secret), 0, 32);
}

function cdr_write_order($order) {
    $path = cdr_order_path($order['id']);
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($order, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    @chmod($tmp, 0600);
    rename($tmp, $path);
}

function cdr_read_order($id) {
    $path = cdr_order_path($id);
    if (!$path || !is_file($path)) return null;
    $o = json_decode(file_get_contents($path), true);
    return is_array($o) ? $o : null;
}

/** Reads, changes and writes one order under an exclusive lock, so two deliveries of the same
 *  event cannot both act on it. $change returns the new order, or null to leave it alone. */
function cdr_update_order($id, $change) {
    $path = cdr_order_path($id);
    if (!$path || !is_file($path)) return null;
    $lock = fopen($path . '.lock', 'c');
    flock($lock, LOCK_EX);
    $order = json_decode(file_get_contents($path), true);
    $next = $change($order);
    if ($next !== null) {
        $next['updated_at'] = gmdate('c');
        cdr_write_order($next);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    return $next !== null ? $next : $order;
}

/** Appends a line to the order's own history, shown on the admin page. */
function cdr_note(&$order, $text) {
    if (!isset($order['log']) || !is_array($order['log'])) $order['log'] = array();
    $order['log'][] = gmdate('Y-m-d H:i:s') . ' UTC  ' . $text;
}

/** Every order id, newest first. */
function cdr_order_ids() {
    $ids = array();
    foreach (glob(cdr_orders_dir() . '/*.json') as $f) {
        $id = basename($f, '.json');
        if (cdr_valid_order_id($id)) $ids[] = $id;
    }
    rsort($ids);
    return $ids;
}

/* ---------- a small per-visitor rate limit (OpenSRS agreement 3.2: no bulk lookups) ---------- */

function cdr_rate_limited($bucket, $max, $windowSeconds) {
    $ip = cdr_visitor_ip();
    if (!$ip) return false;
    $dir = cdr_orders_dir() . '/ratelimit';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/' . $bucket . '-' . substr(hash('sha256', $ip), 0, 16);
    $now = time();
    $fh = @fopen($file, 'c+');
    if (!$fh) return false;
    flock($fh, LOCK_EX);
    $hits = array_filter(explode(',', stream_get_contents($fh)), function ($t) use ($now, $windowSeconds) { return ctype_digit($t) && (int) $t > $now - $windowSeconds; });
    $limited = count($hits) >= $max;
    if (!$limited) $hits[] = (string) $now;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, implode(',', $hits));
    flock($fh, LOCK_UN);
    fclose($fh);
    // Now and then, clear files nobody has touched for a day.
    if (mt_rand(1, 200) === 1) foreach (glob($dir . '/*') as $f) if (filemtime($f) < $now - 86400) @unlink($f);
    return $limited;
}

/* ---------- mail ---------- */

/** Sends a plain-text email.
 *   'mail'    PHP's mail(), which cPanel wires to its own mail server (the default)
 *   'resend'  Resend's HTTPS API (resend_api_key), for a server whose mail ports are blocked, as
 *             DigitalOcean's are; from_email's domain must be verified in Resend
 *   'file'    the order store's outbox, for local proof where no mail server exists */
function cdr_mail($to, $subject, $body) {
    $c = cdr_config();
    if (!$to) return false;
    if ($c['mail_transport'] === 'resend') {
        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, array(
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . $c['resend_api_key'], 'Content-Type: application/json'),
            CURLOPT_POSTFIELDS => json_encode(array('from' => 'Corporate Domain Registry <' . $c['from_email'] . '>', 'to' => array($to), 'reply_to' => $c['notify_email'], 'subject' => $subject, 'text' => $body)),
        ));
        curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $status >= 200 && $status < 300;
    }
    $headers = 'From: Corporate Domain Registry <' . $c['from_email'] . ">\r\n"
        . 'Reply-To: ' . $c['notify_email'] . "\r\n"
        . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n";
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
    $ch = curl_init(cdr_config()['stripe_api'] . $path);
    $headers = array('Authorization: Bearer ' . cdr_config()['stripe_secret_key'], 'Stripe-Version: 2024-06-20');
    if ($idempotencyKey) $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 10,
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
