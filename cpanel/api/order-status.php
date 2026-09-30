<?php
/* GET /api/order-status/?order=<id>&t=<token> — the done page's view of one order.
 *
 * The token is in the address Stripe sends the customer back to (checkout.php), so only the
 * customer's own browser can read the order, and it reads only what the page shows: the status,
 * each domain's state and the amount charged. No contact details.
 *
 * IT ALSO KEEPS THE ORDER MOVING. If the webhook is late, the Checkout Session is read from Stripe
 * here and recorded the same way. If the order is waiting on registration, the reply is sent first
 * and this request then drives the fulfilment for a few seconds (lib/fulfil.php; one driver at a
 * time per order, so a page polling every few seconds is harmless).
 */
require __DIR__ . '/lib/cdr.php';
require __DIR__ . '/lib/fulfil.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    cdr_fail(405, 'method', 'Use GET.');
}
cdr_require_config(array('stripe_secret_key', 'site_url'));
$id = isset($_GET['order']) ? (string) $_GET['order'] : '';
$token = isset($_GET['t']) ? (string) $_GET['t'] : '';
if (!cdr_valid_order_id($id) || !hash_equals(cdr_order_token($id), $token)) cdr_fail(404, 'not_found', 'Order not found.');
$order = cdr_read_order($id);
if (!$order) cdr_fail(404, 'not_found', 'Order not found.');

// The webhook is the normal path; this is the fallback when it has not arrived.
if ($order['status'] === 'pending_payment' && !empty($order['stripe']['session_id'])) {
    list($http, $session) = cdr_stripe('GET', '/checkout/sessions/' . rawurlencode($order['stripe']['session_id']));
    if ($http === 200 && is_array($session)) {
        if (isset($session['status']) && $session['status'] === 'complete') {
            $recorded = cdr_record_checkout($id, $session);
            if ($recorded) $order = $recorded;
        } elseif (isset($session['status']) && $session['status'] === 'expired') {
            $order = cdr_update_order($id, function ($o) {
                if ($o['status'] !== 'pending_payment') return null;
                $o['status'] = 'expired';
                cdr_note($o, 'Checkout expired without payment.');
                return $o;
            });
        }
    }
}

$lines = array();
foreach ($order['lines'] as $l) $lines[] = array('domain' => $l['domain'], 'term' => $l['term'], 'state' => $l['state']);
$out = array(
    'order' => $order['id'],
    'status' => $order['status'],
    'currency' => strtoupper($order['currency']),
    'lines' => $lines,
    'charged' => isset($order['stripe']['amount_captured']) ? $order['stripe']['amount_captured'] / 100 : null,
    'email' => $order['registrant']['email'],
);

if (in_array($order['status'], CDR_DRIVABLE, true)) {
    cdr_json_then_continue(200, $out);
    cdr_fulfil($id, 20);
    exit;
}
cdr_json(200, $out);
