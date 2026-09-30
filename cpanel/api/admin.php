<?php
/* /api/admin/ — CDR's own record of every order, and a CSV of it.
 *
 * Signed in with the admin_token from cdr-config.php (typed once into the form; the browser then
 * holds a cookie derived from it, never the token itself). Nothing here is linked from the site
 * and the page asks search engines to stay away.
 *
 *   /api/admin/                     every order, newest first (filter by text or status)
 *   /api/admin/?order=<id>          one order in full, with its history
 *   /api/admin/?format=csv          one row per domain, for a spreadsheet
 *   /api/admin/?balance=1           adds the Tucows balance to the header line
 */
require __DIR__ . '/lib/cdr.php';
require __DIR__ . '/lib/fulfil.php';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
header('Cache-Control: no-store');

$config = cdr_config();
if ($config['admin_token'] === '' || strlen($config['admin_token']) < 16) {
    http_response_code(503);
    exit('Set admin_token (at least 16 characters) in cdr-config.php to use this page.');
}
$session = hash_hmac('sha256', 'cdr-admin-session', $config['admin_token']);
$csrf = substr(hash_hmac('sha256', 'cdr-admin-csrf', $session), 0, 32);
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);
$cookie = function ($value, $expires) use ($https) {
    setcookie('cdr_admin', $value, array('expires' => $expires, 'path' => '/api/admin', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict'));
};
$h = function ($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); };
$self = strtok($_SERVER['REQUEST_URI'], '?');

if (isset($_GET['logout'])) {
    $cookie('', time() - 3600);
    header('Location: ' . $self, true, 303);
    exit;
}

$signedIn = isset($_COOKIE['cdr_admin']) && hash_equals($session, (string) $_COOKIE['cdr_admin']);

if (!$signedIn) {
    $problem = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['token'])) {
        if (cdr_rate_limited('admin', 10, 900)) $problem = 'Too many attempts. Wait 15 minutes.';
        elseif (hash_equals($config['admin_token'], (string) $_POST['token'])) {
            $cookie($session, time() + 12 * 3600);
            header('Location: ' . $self, true, 303);
            exit;
        } else $problem = 'That is not the admin token.';
    }
    admin_page('Sign in', '<form method="post" class="card"><h1>Orders</h1><p>Enter the admin token from cdr-config.php.</p>'
        . ($problem ? '<p class="bad">' . $h($problem) . '</p>' : '')
        . '<p><input type="password" name="token" autocomplete="current-password" required autofocus> <button>Sign in</button></p></form>');
    exit;
}

/* ---------- actions ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf']) || !hash_equals($csrf, (string) $_POST['csrf'])) { http_response_code(400); exit('Stale form. Go back and reload.'); }
    $id = isset($_POST['order']) ? (string) $_POST['order'] : '';
    if (cdr_valid_order_id($id) && isset($_POST['action']) && $_POST['action'] === 'drive') cdr_fulfil($id, 25);
    header('Location: ' . $self . '?order=' . rawurlencode($id), true, 303);
    exit;
}

$stripeLink = function ($o) use ($h) {
    if (empty($o['stripe']['payment_intent'])) return '';
    $base = !empty($o['test_mode']) ? 'https://dashboard.stripe.com/test/payments/' : 'https://dashboard.stripe.com/payments/';
    return '<a href="' . $h($base . $o['stripe']['payment_intent']) . '" rel="noreferrer" target="_blank">Stripe</a>';
};
$amount = function ($cents, $currency) { return $cents === null ? '' : number_format($cents / 100, 2) . ' ' . strtoupper($currency); };

/* ---------- CSV ---------- */
if (isset($_GET['format']) && $_GET['format'] === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="cdr-orders-' . gmdate('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // so Excel reads the file as UTF-8
    // A cell starting with = + - @ would run as a formula in a spreadsheet.
    $safe = function ($v) { $v = (string) $v; return preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v; };
    fputcsv($out, array('order', 'created_utc', 'order_status', 'test', 'domain', 'years', 'domain_status', 'price', 'currency', 'order_total', 'discount', 'charged', 'tucows_order', 'first_name', 'last_name', 'organisation', 'email', 'phone', 'address1', 'address2', 'city', 'state', 'postal_code', 'country', 'ordered_from_ip', 'stripe_payment'));
    foreach (cdr_order_ids() as $id) {
        $o = cdr_read_order($id);
        if (!$o || $o['status'] === 'pending_payment' || $o['status'] === 'expired' || $o['status'] === 'stripe_error') continue;
        $r = $o['registrant'];
        foreach ($o['lines'] as $l) {
            fputcsv($out, array_map($safe, array(
                $o['id'], $o['created_at'], $o['status'], !empty($o['test_mode']) ? 'yes' : 'no',
                $l['domain'], $l['term'], $l['state'], number_format($l['amount_cents'] / 100, 2, '.', ''), strtoupper($o['currency']),
                number_format($o['subtotal_cents'] / 100, 2, '.', ''),
                isset($o['stripe']['amount_discount']) ? number_format($o['stripe']['amount_discount'] / 100, 2, '.', '') : '',
                isset($o['stripe']['amount_captured']) ? number_format($o['stripe']['amount_captured'] / 100, 2, '.', '') : '',
                isset($l['opensrs']['order_id']) ? $l['opensrs']['order_id'] : '',
                $r['first_name'], $r['last_name'], $r['org_name'], $r['email'], $r['phone'], $r['address1'], $r['address2'], $r['city'], $r['state'], $r['postal_code'], $r['country'],
                isset($o['registrant_ip']) ? $o['registrant_ip'] : '',
                isset($o['stripe']['payment_intent']) ? $o['stripe']['payment_intent'] : '',
            )));
        }
    }
    fclose($out);
    exit;
}

$head = '<p class="meta">Tucows: <b>' . $h($config['opensrs_env'] === 'live' ? 'LIVE' : 'test (Horizon)') . '</b> · Stripe: <b>' . (cdr_test_mode() ? 'test' : 'LIVE') . '</b>';
if (isset($_GET['balance'])) {
    $bal = cdr_opensrs_balance();
    $head .= ' · Tucows balance: <b>' . ($bal === null ? 'could not ask' : '$' . number_format($bal, 2) . ' USD') . '</b>';
} else $head .= ' · <a href="?balance=1">Show Tucows balance</a>';
$head .= ' · <a href="?format=csv">Download CSV</a> · <a href="?logout=1">Sign out</a></p>';

/* ---------- one order ---------- */
if (isset($_GET['order'])) {
    $o = cdr_valid_order_id($_GET['order']) ? cdr_read_order($_GET['order']) : null;
    if (!$o) { http_response_code(404); admin_page('Not found', $head . '<p>No such order. <a href="' . $h($self) . '">All orders</a></p>'); exit; }
    $r = $o['registrant'];
    $rows = '';
    foreach ($o['lines'] as $l) {
        $rows .= '<tr><td>' . $h($l['domain']) . '</td><td>' . $h($l['term']) . '</td><td>' . $amount($l['amount_cents'], $o['currency']) . '</td><td><span class="s s-' . $h($l['state']) . '">' . $h($l['state']) . '</span>' . (!empty($l['reason']) ? ' (' . $h($l['reason']) . ')' : '') . '</td><td>' . $h(isset($l['opensrs']['order_id']) ? $l['opensrs']['order_id'] : '') . '</td><td>' . $h(isset($l['opensrs']['text']) ? $l['opensrs']['code'] . ' ' . $l['opensrs']['text'] : '') . '</td></tr>';
    }
    $body = $head . '<p><a href="' . $h($self) . '">All orders</a></p>'
        . '<div class="card"><h1>Order ' . $h($o['id']) . (!empty($o['test_mode']) ? ' <span class="s">TEST</span>' : '') . '</h1>'
        . '<p><span class="s s-' . $h($o['status']) . '">' . $h($o['status']) . '</span> · created ' . $h($o['created_at']) . ' · ' . $stripeLink($o) . '</p>'
        . '<p>Total ' . $amount($o['subtotal_cents'], $o['currency'])
        . (isset($o['stripe']['amount_discount']) && $o['stripe']['amount_discount'] ? ' · promotion ' . $amount($o['stripe']['amount_discount'], $o['currency']) : '')
        . (isset($o['stripe']['amount_authorized']) ? ' · authorised ' . $amount($o['stripe']['amount_authorized'], $o['currency']) : '')
        . (isset($o['stripe']['amount_captured']) ? ' · <b>charged ' . $amount($o['stripe']['amount_captured'], $o['currency']) . '</b>' : '') . '</p>'
        . (in_array($o['status'], CDR_DRIVABLE, true) ? '<form method="post"><input type="hidden" name="csrf" value="' . $h($csrf) . '"><input type="hidden" name="order" value="' . $h($o['id']) . '"><input type="hidden" name="action" value="drive"><button>Continue this order now</button></form>' : '')
        . '<table><thead><tr><th>Domain</th><th>Years</th><th>Price</th><th>State</th><th>Tucows order</th><th>Tucows said</th></tr></thead><tbody>' . $rows . '</tbody></table>'
        . '<h2>Registrant</h2><p>' . $h($r['first_name'] . ' ' . $r['last_name']) . ($r['org_name'] !== '' ? ', ' . $h($r['org_name']) : '') . '<br>'
        . $h($r['address1']) . ($r['address2'] !== '' ? ', ' . $h($r['address2']) : '') . '<br>'
        . $h($r['city'] . ($r['state'] !== '' ? ', ' . $r['state'] : '') . ' ' . $r['postal_code'] . ', ' . $r['country']) . '<br>'
        . '<a href="mailto:' . $h($r['email']) . '">' . $h($r['email']) . '</a> · ' . $h($r['phone']) . '</p>'
        . '<p class="meta">Ordered from ' . $h(isset($o['registrant_ip']) ? $o['registrant_ip'] : '?') . (isset($o['visitor_country']) ? ' (' . $h($o['visitor_country']) . ')' : '') . ', agreement accepted ' . $h(isset($o['agreement']['accepted_at']) ? $o['agreement']['accepted_at'] : '?') . '</p>'
        . '<h2>History</h2><pre>' . $h(implode("\n", isset($o['log']) ? $o['log'] : array())) . '</pre></div>';
    admin_page('Order ' . $o['id'], $body);
    exit;
}

/* ---------- every order ---------- */
$q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
$want = isset($_GET['status']) ? (string) $_GET['status'] : '';
$hideAbandoned = !isset($_GET['all']);
$rows = '';
$count = 0;
$statuses = array();
foreach (cdr_order_ids() as $id) {
    $o = cdr_read_order($id);
    if (!$o) continue;
    $statuses[$o['status']] = true;
    if ($hideAbandoned && in_array($o['status'], array('pending_payment', 'expired', 'stripe_error'), true) && $want === '') continue;
    if ($want !== '' && $o['status'] !== $want) continue;
    $r = $o['registrant'];
    $domains = array();
    foreach ($o['lines'] as $l) $domains[] = $h($l['domain']) . ' <span class="s s-' . $h($l['state']) . '">' . $h($l['state']) . '</span>';
    $text = strtolower($o['id'] . ' ' . $r['first_name'] . ' ' . $r['last_name'] . ' ' . $r['org_name'] . ' ' . $r['email'] . ' ' . implode(' ', array_map(function ($l) { return $l['domain']; }, $o['lines'])));
    if ($q !== '' && strpos($text, strtolower($q)) === false) continue;
    $count++;
    $rows .= '<tr><td><a href="?order=' . $h($o['id']) . '">' . $h($o['id']) . '</a>' . (!empty($o['test_mode']) ? ' <span class="s">TEST</span>' : '') . '</td>'
        . '<td>' . $h(substr($o['created_at'], 0, 16)) . '</td>'
        . '<td><span class="s s-' . $h($o['status']) . '">' . $h($o['status']) . '</span></td>'
        . '<td>' . $h($r['first_name'] . ' ' . $r['last_name']) . '<br><small>' . $h($r['email']) . '</small></td>'
        . '<td>' . implode('<br>', $domains) . '</td>'
        . '<td>' . $amount($o['subtotal_cents'], $o['currency']) . '</td>'
        . '<td>' . (isset($o['stripe']['amount_captured']) ? $amount($o['stripe']['amount_captured'], $o['currency']) : '') . '</td>'
        . '<td>' . $stripeLink($o) . '</td></tr>';
}
$options = '<option value="">Any status</option>';
foreach (array_keys($statuses) as $s) $options .= '<option' . ($s === $want ? ' selected' : '') . '>' . $h($s) . '</option>';
$body = $head . '<div class="card"><h1>Orders</h1>'
    . '<form method="get" class="filters"><input type="search" name="q" value="' . $h($q) . '" placeholder="Name, email, domain or order"> <select name="status">' . $options . '</select> <button>Filter</button>'
    . ($hideAbandoned ? ' <a href="?all=1">Include unpaid checkouts</a>' : ' <a href="' . $h($self) . '">Hide unpaid checkouts</a>') . '</form>'
    . '<p class="meta">' . $count . ' shown.</p>'
    . '<div class="scroll"><table><thead><tr><th>Order</th><th>Created (UTC)</th><th>Status</th><th>Customer</th><th>Domains</th><th>Total</th><th>Charged</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div></div>';
admin_page('Orders', $body);

function admin_page($title, $body) {
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">'
        . '<title>' . htmlspecialchars($title) . ' | CDR admin</title><style>'
        . 'body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:16px;background:#f4f5f7;color:#111}'
        . '.card{background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;max-width:1200px}'
        . 'h1{margin:0 0 8px;font-size:22px}h2{font-size:17px;margin:20px 0 6px}'
        . 'table{border-collapse:collapse;width:100%;margin-top:8px}th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #eee}th{font-size:13px;color:#555}'
        . '.scroll{overflow-x:auto}.meta{color:#555;font-size:13px}.bad{color:#b00020}'
        . '.s{display:inline-block;font-size:12px;padding:0 6px;border-radius:3px;background:#eee}'
        . '.s-registered{background:#d7f5dd}.s-partially_registered,.s-pending,.s-fulfilling,.s-authorized,.s-registering{background:#fff1c2}'
        . '.s-failed,.s-amount_mismatch,.s-needs_review,.s-settle_error,.s-unknown,.s-payment_failed{background:#ffd9d9}'
        . 'pre{white-space:pre-wrap;background:#f7f7f7;padding:8px;font-size:12px}input,select,button{font:inherit;padding:4px 8px}'
        . '</style></head><body>' . $body . '</body></html>';
}
