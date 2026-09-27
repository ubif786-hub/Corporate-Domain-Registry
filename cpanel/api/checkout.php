<?php
/* POST /api/checkout/ — the registrant form and the cart in, a Stripe Checkout URL out.
 *
 * The page sends JSON: { items: [{domain, service, term, authCode?}], registrant: {...}, agree }.
 * NOTHING THE BROWSER SAYS ABOUT MONEY IS BELIEVED. Every line is priced here from catalog.json
 * (the same file the page renders its prices from), and the amount Stripe charges is the amount
 * computed here. The order is written above the document root as pending_payment BEFORE Stripe is
 * asked, so the webhook always has a record to mark paid.
 *
 * STRIPE CHECKOUT, HOSTED: the card never touches this site. The customer is sent to Stripe's own
 * page and comes back to /checkout/done/. Whether they paid is decided by the webhook
 * (stripe-webhook.php), never by the return visit, which anyone can type.
 *
 * NO REGISTRATION HAPPENS HERE YET. Payment and fulfilment are coupled (PROJECT.md), so this runs
 * on TEST keys only until OpenSRS is wired in (REFACTOR_QUEUE CDR-FULFIL-1).
 */
require __DIR__ . '/lib/cdr.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    cdr_fail(405, 'method', 'Use POST.');
}
$raw = file_get_contents('php://input', false, null, 0, 65536);
$in = json_decode($raw, true);
if (!is_array($in)) cdr_fail(400, 'bad_request', 'The request could not be read.');

$config = cdr_config();
$catalog = cdr_catalog();
$errors = array();

/* ---------- the cart ---------- */
$items = isset($in['items']) && is_array($in['items']) ? array_values($in['items']) : array();
if (!$items) cdr_fail(422, 'empty_cart', 'Your cart is empty.');
if (count($items) > 20) cdr_fail(422, 'cart_too_large', 'Up to 20 domains per order. Split the rest into a second order.');

$labels = array('register' => 'Domain Registration', 'renew' => 'Domain Renewal / Transfer', 'transfer' => 'Domain Renewal / Transfer');
$lines = array();
$lineErrors = array();
$seen = array();
foreach ($items as $i => $item) {
    $domain = isset($item['domain']) && is_string($item['domain']) ? strtolower(trim($item['domain'])) : '';
    $service = isset($item['service']) ? $item['service'] : '';
    $term = isset($item['term']) ? (int) $item['term'] : 0;
    // A registrable name: labels of letters, digits and inner hyphens (punycode included), a TLD of letters.
    if (strlen($domain) > 253 || !preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/', $domain)) {
        $lineErrors[$i] = 'This is not a domain name we can register.';
        continue;
    }
    if (!isset($labels[$service])) { $lineErrors[$i] = 'Unknown service.'; continue; }
    if (!in_array($term, $catalog['terms'], true) || !isset($catalog['ladder'][(string) $term])) { $lineErrors[$i] = 'Unknown term.'; continue; }
    $tld = substr($domain, strrpos($domain, '.') + 1);
    if (in_array($tld, $catalog['notSoldOnline'], true)) {
        $lineErrors[$i] = '.' . $tld . ' needs registry details this checkout does not collect. Contact support to order it.';
        continue;
    }
    $key = $service . ':' . $domain;
    if (isset($seen[$key])) continue;
    $seen[$key] = true;
    $authCode = '';
    if ($service !== 'register' && isset($item['authCode']) && is_string($item['authCode'])) {
        $authCode = trim($item['authCode']);
        if (strlen($authCode) > 64 || preg_match('/[\x00-\x1F\x7F]/', $authCode)) { $lineErrors[$i] = 'The transfer code is not valid.'; continue; }
    }
    $lines[] = array(
        'domain' => $domain,
        'service' => $service,
        'label' => $labels[$service],
        'term' => $term,
        'amount_cents' => (int) round($catalog['ladder'][(string) $term] * 100),
        'auth_code' => $authCode,
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
    // Stored as E.164. OpenSRS wants +CC.NNNN, which needs the calling code split out; that
    // conversion belongs to fulfilment (REFACTOR_QUEUE CDR-FULFIL-1).
    $digits = preg_replace('/[\s().-]/', '', $registrant['phone']);
    if (!preg_match('/^\+[1-9]\d{6,14}$/', $digits)) $errors['phone'] = 'Include the country code, for example +1 416 555 0123.';
    else $registrant['phone'] = $digits;
}
if ($registrant['country'] !== '' && !in_array($registrant['country'], $catalog['countries'], true)) $errors['country'] = 'Choose a country.';
// OpenSRS requires a state or province for Canada and the United States, and rejects the order without one.
if (in_array($registrant['country'], array('CA', 'US'), true) && $registrant['state'] === '') $errors['state'] = 'Required for ' . ($registrant['country'] === 'CA' ? 'Canada' : 'the United States') . '.';

if (empty($in['agree'])) $errors['agree'] = 'Accept the agreement to continue.';

if ($errors || $lineErrors) cdr_fail(422, 'invalid', 'Some details need attention.', array('fields' => (object) $errors, 'lines' => (object) $lineErrors));
if (!$lines) cdr_fail(422, 'empty_cart', 'Your cart is empty.');

/* ---------- the order, then the Stripe session ---------- */
$total = 0;
foreach ($lines as $l) $total += $l['amount_cents'];
$id = cdr_new_order_id();
$now = gmdate('c');
$order = array(
    'id' => $id,
    'status' => 'pending_payment',
    'test_mode' => cdr_test_mode(),
    'created_at' => $now,
    'updated_at' => $now,
    'currency' => strtolower($catalog['chargeCurrency']),
    'total_cents' => $total,
    'lines' => $lines,
    'registrant' => $registrant,
    'registrant_ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '',
    'stripe' => array(),
    'events' => array(),
);
cdr_write_order($order);

$params = array(
    'mode' => 'payment',
    'client_reference_id' => $id,
    'customer_email' => $registrant['email'],
    'success_url' => $config['site_url'] . '/checkout/done/?order=' . $id,
    'cancel_url' => $config['site_url'] . '/checkout/',
    'metadata' => array('order_id' => $id),
    'payment_intent_data' => array(
        'metadata' => array('order_id' => $id),
        'description' => 'Corporate Domain Registry order ' . $id,
    ),
    'line_items' => array(),
);
foreach ($lines as $l) {
    $params['line_items'][] = array(
        'quantity' => 1,
        'price_data' => array(
            'currency' => $order['currency'],
            'unit_amount' => $l['amount_cents'],
            'product_data' => array('name' => $l['label'] . ', ' . $l['term'] . ($l['term'] === 1 ? ' year' : ' years') . ', ' . $l['domain']),
        ),
    );
}

list($status, $session) = cdr_stripe('POST', '/checkout/sessions', $params, 'cdr-checkout-' . $id);
if ($status !== 200 || empty($session['url'])) {
    cdr_update_order($id, function ($o) use ($status, $session) {
        $o['status'] = 'stripe_error';
        $o['updated_at'] = gmdate('c');
        $o['stripe']['error'] = array('http' => $status, 'type' => isset($session['error']['type']) ? $session['error']['type'] : null, 'message' => isset($session['error']['message']) ? $session['error']['message'] : null);
        return $o;
    });
    cdr_fail(502, 'payment_unavailable', 'Payment could not be started. Nothing was charged; try again in a moment.');
}

cdr_update_order($id, function ($o) use ($session) {
    $o['stripe']['session_id'] = $session['id'];
    $o['stripe']['expires_at'] = isset($session['expires_at']) ? gmdate('c', $session['expires_at']) : null;
    $o['updated_at'] = gmdate('c');
    return $o;
});

cdr_json(200, array('url' => $session['url'], 'order' => $id));
