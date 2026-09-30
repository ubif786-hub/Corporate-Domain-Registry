<?php
/* POST /api/stripe-webhook/ — Stripe tells us the customer finished paying.
 *
 * Registered in the Stripe dashboard (Developers, Webhooks) for:
 *   checkout.session.completed             the customer finished Checkout; the card is authorised, not charged
 *   checkout.session.expired               they walked away; the order is closed
 *   checkout.session.async_payment_failed  a delayed payment did not clear
 *
 * EVERY DELIVERY IS VERIFIED against the endpoint's signing secret before its body is believed.
 * Stripe retries a delivery until it gets a 2xx, and may send one event twice, so every step is
 * idempotent: an event already recorded on the order is a no-op.
 *
 * The payment itself is read back from Stripe and checked (cdr_record_checkout, lib/fulfil.php).
 * Then the reply goes back to Stripe at once and the same request carries on into the
 * fulfilment: register at Tucows, then capture or release.
 */
require __DIR__ . '/lib/cdr.php';
require __DIR__ . '/lib/fulfil.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    cdr_fail(405, 'method', 'Use POST.');
}
$config = cdr_require_config(array('stripe_secret_key', 'stripe_webhook_secret', 'site_url', 'notify_email'));
$payload = file_get_contents('php://input');
$header = isset($_SERVER['HTTP_STRIPE_SIGNATURE']) ? $_SERVER['HTTP_STRIPE_SIGNATURE'] : '';
if (!cdr_stripe_signature_ok($payload, $header, $config['stripe_webhook_secret'])) {
    cdr_fail(400, 'signature', 'Signature verification failed.');
}
$event = json_decode($payload, true);
if (!is_array($event) || empty($event['id']) || empty($event['type'])) cdr_fail(400, 'bad_event', 'Unreadable event.');

$handled = array('checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_failed');
if (!in_array($event['type'], $handled, true)) cdr_json(200, array('received' => true, 'ignored' => $event['type']));

$session = isset($event['data']['object']) ? $event['data']['object'] : array();
$orderId = isset($session['metadata']['order_id']) ? $session['metadata']['order_id'] : (isset($session['client_reference_id']) ? $session['client_reference_id'] : null);
if (!cdr_valid_order_id($orderId) || !cdr_read_order($orderId)) cdr_json(200, array('received' => true, 'ignored' => 'unknown order'));

if ($event['type'] === 'checkout.session.completed') {
    $order = cdr_record_checkout($orderId, $session, $event['id']);
    if ($order === false) cdr_fail(503, 'stripe_unavailable', 'Could not read the payment; Stripe will retry.');
} else {
    $order = cdr_update_order($orderId, function ($o) use ($event) {
        if (in_array($event['id'], $o['events'], true)) return null;
        $o['events'][] = $event['id'];
        if ($o['status'] !== 'pending_payment') return $o;
        $o['status'] = $event['type'] === 'checkout.session.expired' ? 'expired' : 'payment_failed';
        cdr_note($o, $event['type'] === 'checkout.session.expired' ? 'Checkout expired without payment.' : 'Payment failed.');
        return $o;
    });
}

if ($order['status'] !== 'authorized') cdr_json(200, array('received' => true, 'order' => $order['id'], 'status' => $order['status']));

// Answer Stripe now, then register in the same request.
cdr_json_then_continue(200, array('received' => true, 'order' => $order['id'], 'status' => 'authorized'));
cdr_fulfil($order['id'], 120);
