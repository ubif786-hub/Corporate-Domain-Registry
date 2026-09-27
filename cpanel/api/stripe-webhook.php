<?php
/* POST /api/stripe-webhook/ — Stripe tells us an order was paid. The ONLY thing that marks one paid.
 *
 * Registered in the Stripe dashboard (Developers, Webhooks) for four events:
 *   checkout.session.completed                 the customer finished Checkout
 *   checkout.session.async_payment_succeeded   a delayed payment method cleared later
 *   checkout.session.async_payment_failed      ... or did not
 *   checkout.session.expired                   they walked away; the order is closed
 *
 * EVERY DELIVERY IS VERIFIED against the endpoint's signing secret (cdr-config.php) before its body
 * is believed, and the amount Stripe collected must equal the amount checkout.php computed, or the
 * order is flagged rather than paid. Stripe retries a delivery until it gets a 2xx, and may send
 * one event twice, so every step is idempotent: an event already recorded on the order is a no-op.
 *
 * A PAID ORDER IS NOT A REGISTERED DOMAIN. This records the payment and emails CDR. Registration
 * through OpenSRS is the next phase (REFACTOR_QUEUE CDR-FULFIL-1).
 */
require __DIR__ . '/lib/cdr.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    cdr_fail(405, 'method', 'Use POST.');
}
$config = cdr_config();
$payload = file_get_contents('php://input');
$header = isset($_SERVER['HTTP_STRIPE_SIGNATURE']) ? $_SERVER['HTTP_STRIPE_SIGNATURE'] : '';
if (!cdr_stripe_signature_ok($payload, $header, $config['stripe_webhook_secret'])) {
    cdr_fail(400, 'signature', 'Signature verification failed.');
}
$event = json_decode($payload, true);
if (!is_array($event) || empty($event['id']) || empty($event['type'])) cdr_fail(400, 'bad_event', 'Unreadable event.');

$handled = array('checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired');
if (!in_array($event['type'], $handled, true)) cdr_json(200, array('received' => true, 'ignored' => $event['type']));

$session = isset($event['data']['object']) ? $event['data']['object'] : array();
$orderId = isset($session['metadata']['order_id']) ? $session['metadata']['order_id'] : (isset($session['client_reference_id']) ? $session['client_reference_id'] : null);
if (!cdr_valid_order_id($orderId)) cdr_json(200, array('received' => true, 'ignored' => 'no order id'));

$notify = null;
$order = cdr_update_order($orderId, function ($o) use ($event, $session, &$notify) {
    if (in_array($event['id'], $o['events'], true)) return null;
    $o['events'][] = $event['id'];
    $o['updated_at'] = gmdate('c');
    $o['stripe']['session_id'] = $session['id'];
    $type = $event['type'];
    $paid = ($type === 'checkout.session.completed' && isset($session['payment_status']) && $session['payment_status'] === 'paid')
        || $type === 'checkout.session.async_payment_succeeded';

    if ($paid) {
        if ($o['status'] === 'paid') return $o;
        $amount = isset($session['amount_total']) ? (int) $session['amount_total'] : -1;
        $currency = isset($session['currency']) ? $session['currency'] : '';
        $o['stripe']['payment_intent'] = isset($session['payment_intent']) ? $session['payment_intent'] : null;
        $o['stripe']['amount_total'] = $amount;
        $o['stripe']['livemode'] = !empty($session['livemode']);
        $o['stripe']['customer'] = array(
            'email' => isset($session['customer_details']['email']) ? $session['customer_details']['email'] : null,
            'name' => isset($session['customer_details']['name']) ? $session['customer_details']['name'] : null,
        );
        if ($amount !== $o['total_cents'] || $currency !== $o['currency']) {
            $o['status'] = 'amount_mismatch';
            $notify = 'mismatch';
        } else {
            $o['status'] = 'paid';
            $o['paid_at'] = gmdate('c');
            $notify = 'paid';
        }
    } elseif ($type === 'checkout.session.completed') {
        $o['status'] = 'awaiting_payment'; // a delayed method: async_payment_* decides it
    } elseif ($type === 'checkout.session.async_payment_failed') {
        $o['status'] = 'payment_failed';
        $notify = 'failed';
    } elseif ($type === 'checkout.session.expired' && $o['status'] === 'pending_payment') {
        $o['status'] = 'expired';
    }
    return $o;
});
if ($order === null) cdr_json(200, array('received' => true, 'ignored' => 'unknown order'));

if ($notify) {
    $test = !empty($order['test_mode']) ? '[TEST] ' : '';
    $subjects = array(
        'paid' => $test . 'Paid order ' . $order['id'] . ', ' . cdr_money($order['total_cents']),
        'mismatch' => $test . 'CHECK order ' . $order['id'] . ': Stripe collected a different amount',
        'failed' => $test . 'Payment failed for order ' . $order['id'],
    );
    $r = $order['registrant'];
    $body = array();
    if (!empty($order['test_mode'])) $body[] = "TEST MODE. No real money moved and nothing was registered.\n";
    if ($notify === 'paid') $body[] = "An order was paid. NOTHING HAS BEEN REGISTERED YET: register each domain below in the OpenSRS control panel, then reply to the customer.\n";
    if ($notify === 'mismatch') $body[] = 'Stripe collected ' . cdr_money(max(0, $order['stripe']['amount_total'])) . ' against an order total of ' . cdr_money($order['total_cents']) . ". Do not register anything until this is checked in the Stripe dashboard.\n";
    if ($notify === 'failed') $body[] = "The customer's delayed payment did not clear. Nothing is owed and nothing should be registered.\n";
    $body[] = 'Order: ' . $order['id'];
    $body[] = 'Total: ' . cdr_money($order['total_cents']);
    $body[] = 'Stripe payment: ' . (isset($order['stripe']['payment_intent']) ? $order['stripe']['payment_intent'] : 'n/a');
    $body[] = '';
    foreach ($order['lines'] as $l) {
        $body[] = '- ' . $l['domain'] . ': ' . $l['label'] . ', ' . $l['term'] . ($l['term'] === 1 ? ' year' : ' years') . ', ' . cdr_money($l['amount_cents']) . ($l['auth_code'] !== '' ? ' (transfer code on file in the order record)' : '');
    }
    $body[] = '';
    $body[] = 'Registrant:';
    $body[] = $r['first_name'] . ' ' . $r['last_name'] . ($r['org_name'] !== '' ? ', ' . $r['org_name'] : '');
    $body[] = $r['address1'] . ($r['address2'] !== '' ? ', ' . $r['address2'] : '');
    $body[] = $r['city'] . ($r['state'] !== '' ? ', ' . $r['state'] : '') . ' ' . $r['postal_code'] . ', ' . $r['country'];
    $body[] = $r['email'] . ', ' . $r['phone'];
    $body[] = '';
    $body[] = 'The full record is ' . $order['id'] . '.json in the orders folder beside public_html.';
    cdr_mail($config['notify_email'], $subjects[$notify], implode("\n", $body) . "\n");
}

cdr_json(200, array('received' => true, 'order' => $order['id'], 'status' => $order['status']));
