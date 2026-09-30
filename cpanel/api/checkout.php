<?php
/* POST /api/checkout/ — the registrant form and the cart in, a Stripe Checkout URL out.
 *
 * The page sends JSON: { items: [{domain, term}], registrant: {...}, agree }.
 *
 * NOTHING THE BROWSER SAYS ABOUT MONEY IS BELIEVED. Every line is priced here from catalog.json
 * (the same file the page renders its prices from), in the visitor's currency: CAD in Canada, USD
 * everywhere else, decided from the same IP database as the header chip.
 *
 * EVERY DOMAIN IS CHECKED AGAIN, straight at the registry (no cache), before Stripe is asked. A
 * name that went while it sat in the cart is refused here, before any card is touched.
 *
 * THE CARD IS ONLY AUTHORISED (capture_method=manual). stripe-webhook.php hands the order to the
 * fulfilment (lib/fulfil.php), which registers each domain and then charges only for what
 * registered, releasing the rest of the hold. Promotion codes are entered on Stripe's page.
 */
require __DIR__ . '/lib/cdr.php';
require __DIR__ . '/lib/opensrs.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    cdr_fail(405, 'method', 'Use POST.');
}
$config = cdr_require_config(array('stripe_secret_key', 'site_url', 'notify_email', 'opensrs_username', 'opensrs_api_key'));
// Test with test, live with live. Real domains for test money, or real money for test domains,
// is a misconfiguration, and the shop stays shut until it is fixed.
if (($config['opensrs_env'] === 'live') === cdr_test_mode()) cdr_fail(503, 'not_configured', 'The shop is not fully configured yet.');
$raw = file_get_contents('php://input', false, null, 0, 65536);
$in = json_decode($raw, true);
if (!is_array($in)) cdr_fail(400, 'bad_request', 'The request could not be read.');
if (cdr_rate_limited('checkout', 20, 600)) cdr_fail(429, 'too_many', 'Too many attempts. Wait a few minutes and try again.');

$catalog = cdr_catalog();
$currency = cdr_visitor_currency();
$errors = array();

/* ---------- the cart ---------- */
$items = isset($in['items']) && is_array($in['items']) ? array_values($in['items']) : array();
if (!$items) cdr_fail(422, 'empty_cart', 'Your cart is empty.');
if (count($items) > 10) cdr_fail(422, 'cart_too_large', 'Up to 10 domains per order. Please place a second order for the rest.');

$lines = array();
$lineErrors = array();
$lineIndex = array(); // cart position of each line, for error messages
$seen = array();
foreach ($items as $i => $item) {
    $domain = cdr_normalise_domain(isset($item['domain']) && is_string($item['domain']) ? $item['domain'] : '');
    $term = isset($item['term']) ? (int) $item['term'] : 0;
    if (!cdr_valid_domain($domain)) { $lineErrors[$i] = 'This is not a domain name we can register.'; continue; }
    if (!cdr_sellable($domain)) { $lineErrors[$i] = '.' . cdr_tld($domain) . ' domains are not sold online. Contact us to order one.'; continue; }
    $amount = cdr_price_cents($term, $currency);
    if (!in_array($term, $catalog['terms'], true) || $amount === null) { $lineErrors[$i] = 'Choose a registration period.'; continue; }
    if (isset($seen[$domain])) continue;
    $seen[$domain] = true;
    $lineIndex[] = $i;
    $lines[] = array(
        'domain' => $domain,
        'service' => 'register',
        'label' => 'Domain registration',
        'term' => $term,
        'amount_cents' => $amount,
        'state' => 'new',
        'attempts' => 0,
    );
}

/* ---------- the registrant: one contact, the one OpenSRS copies to admin and billing ---------- */
$r = isset($in['registrant']) && is_array($in['registrant']) ? $in['registrant'] : array();
$field = function ($name, $max, $required = true) use ($r, &$errors) {
    $v = isset($r[$name]) && is_string($r[$name]) ? trim(preg_replace('/\s+/u', ' ', $r[$name])) : '';
    if ($v === '' && $required) { $errors[$name] = 'Required.'; return ''; }
    // Characters, not bytes, without mbstring (a shared host may not enable it).
    if (preg_match_all('/./us', $v) > $max) { $errors[$name] = 'At most ' . $max . ' characters.'; return ''; }
    if (preg_match('/[\x00-\x1F\x7F<>]/u', $v)) { $errors[$name] = 'Remove the special characters.'; return ''; }
    return $v;
};
$registrant = array(
    'first_name' => $field('first_name', 64),
    'last_name' => $field('last_name', 64),
    'org_name' => $field('org_name', 64, false),
    'email' => $field('email', 127),
    'phone' => $field('phone', 24),
    'address1' => $field('address1', 64),
    'address2' => $field('address2', 64, false),
    'city' => $field('city', 64),
    'state' => $field('state', 32, false),
    'postal_code' => $field('postal_code', 16),
    'country' => strtoupper($field('country', 2)),
);
if ($registrant['email'] !== '' && !filter_var($registrant['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address.';
if ($registrant['phone'] !== '') {
    // Stored as E.164; lib/opensrs.php turns it into OpenSRS's +CC.NUMBER at registration.
    $digits = preg_replace('/[\s().-]/', '', $registrant['phone']);
    // North American numbers typed without the plus: 4165550123 or 14165550123.
    if (in_array($registrant['country'], array('CA', 'US'), true)) {
        if (preg_match('/^\d{10}$/', $digits)) $digits = '+1' . $digits;
        elseif (preg_match('/^1\d{10}$/', $digits)) $digits = '+' . $digits;
    }
    if (!preg_match('/^\+[1-9]\d{6,14}$/', $digits)) $errors['phone'] = 'Include the country code, for example +1 416 555 0123.';
    else $registrant['phone'] = $digits;
}
if ($registrant['country'] !== '' && !in_array($registrant['country'], $catalog['countries'], true)) $errors['country'] = 'Choose a country.';
// OpenSRS requires a state or province for Canada and the United States, and rejects the order without one.
if (in_array($registrant['country'], array('CA', 'US'), true) && $registrant['state'] === '') $errors['state'] = 'Required for ' . ($registrant['country'] === 'CA' ? 'Canada' : 'the United States') . '.';

if (empty($in['agree'])) $errors['agree'] = 'Accept the agreement to continue.';

if ($errors || $lineErrors) cdr_fail(422, 'invalid', 'Some details need attention.', array('fields' => (object) $errors, 'lines' => (object) $lineErrors));
if (!$lines) cdr_fail(422, 'empty_cart', 'Your cart is empty.');

/* ---------- the final availability check, at the registry ---------- */
foreach ($lines as $n => $l) {
    $look = cdr_opensrs_lookup($l['domain'], true);
    if ($look['status'] === 'error') {
        cdr_fail(503, 'registry_unavailable', 'We could not confirm availability with the registry just now. Nothing was charged; please try again in a moment.');
    }
    if ($look['status'] !== 'available') $lineErrors[$lineIndex[$n]] = 'This domain is no longer available. Remove it from your cart to continue.';
}
if ($lineErrors) cdr_fail(422, 'unavailable', 'A domain in your cart is no longer available.', array('fields' => (object) array(), 'lines' => (object) $lineErrors));

/* ---------- the order, then the Stripe session ---------- */
$subtotal = 0;
foreach ($lines as $l) $subtotal += $l['amount_cents'];
$id = cdr_new_order_id();
$now = gmdate('c');
$ip = cdr_visitor_ip();
$order = array(
    'id' => $id,
    'status' => 'pending_payment',
    'test_mode' => cdr_test_mode(),
    'opensrs_env' => $config['opensrs_env'],
    'created_at' => $now,
    'updated_at' => $now,
    'currency' => $currency,
    'subtotal_cents' => $subtotal,
    'lines' => $lines,
    'registrant' => $registrant,
    // Kept for the registrar agreement (OpenSRS MSA 3.9): who ordered, from where, and when.
    'registrant_ip' => $ip ? $ip : '',
    'visitor_country' => cdr_visitor_country(),
    'agreement' => array('accepted_at' => $now, 'document' => 'Domain Registration and Management Agreement', 'url' => $config['site_url'] . '/tos/'),
    'stripe' => array(),
    'events' => array(),
    'log' => array(),
);
cdr_note($order, 'Order created, ' . cdr_money($subtotal, $currency) . '; all domains confirmed available.');
cdr_write_order($order);

$params = array(
    'mode' => 'payment',
    'payment_method_types' => array('card'),
    'client_reference_id' => $id,
    'customer_email' => $registrant['email'],
    'success_url' => $config['site_url'] . '/checkout/done/?order=' . $id . '&t=' . cdr_order_token($id),
    'cancel_url' => $config['site_url'] . '/checkout/',
    // Short, so the availability check above is still fresh when the customer pays. Stripe's
    // minimum is 30 minutes; a little more so a clock a few minutes out cannot fall under it.
    'expires_at' => time() + 40 * 60,
    'allow_promotion_codes' => 'true',
    'metadata' => array('order_id' => $id),
    'payment_intent_data' => array(
        'capture_method' => 'manual',
        'metadata' => array('order_id' => $id),
        'description' => 'Corporate Domain Registry order ' . $id,
    ),
    'line_items' => array(),
);
foreach ($lines as $l) {
    $params['line_items'][] = array(
        'quantity' => 1,
        'price_data' => array(
            'currency' => $currency,
            'unit_amount' => $l['amount_cents'],
            'product_data' => array('name' => $l['domain'] . ', registration for ' . $l['term'] . ($l['term'] === 1 ? ' year' : ' years')),
        ),
    );
}

list($status, $session) = cdr_stripe('POST', '/checkout/sessions', $params, 'cdr-checkout-' . $id);
if ($status !== 200 || empty($session['url'])) {
    cdr_update_order($id, function ($o) use ($status, $session) {
        $o['status'] = 'stripe_error';
        $o['stripe']['error'] = array('http' => $status, 'type' => isset($session['error']['type']) ? $session['error']['type'] : null, 'message' => isset($session['error']['message']) ? $session['error']['message'] : null);
        cdr_note($o, 'Stripe refused the session: ' . (isset($session['error']['message']) ? $session['error']['message'] : 'HTTP ' . $status));
        return $o;
    });
    cdr_fail(502, 'payment_unavailable', 'Payment could not be started. Nothing was charged; try again in a moment.');
}

cdr_update_order($id, function ($o) use ($session) {
    $o['stripe']['session_id'] = $session['id'];
    $o['stripe']['expires_at'] = isset($session['expires_at']) ? gmdate('c', $session['expires_at']) : null;
    return $o;
});

cdr_json(200, array('url' => $session['url'], 'order' => $id));
