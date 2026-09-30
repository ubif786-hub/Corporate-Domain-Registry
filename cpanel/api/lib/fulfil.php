<?php
/* After the card is authorised: register each domain at Tucows, then take the money for what
 * registered and release the rest of the hold.
 *
 *   order.status   pending_payment -> authorized -> fulfilling -> registered
 *                                                             -> partially_registered
 *                                                             -> failed      (nothing registered, hold released)
 *                                                  -> pending   (Tucows is still working; the cron job checks back)
 *                  plus expired, payment_failed, amount_mismatch, settle_error (retried), and
 *                  needs_review (settled on day six, or a payment that needs a human)
 *   line.state     new -> registering -> registered | pending | failed | unknown
 *
 * THREE CALLERS DRIVE THIS, and any of them may be first: the Stripe webhook (right after the
 * card is authorised), the done page's polling (order-status.php), and the cron job. One
 * non-blocking file lock per order means only one of them works at a time; the others return.
 *
 * NEVER REGISTER TWICE. A line is written as "registering" BEFORE sw_register is sent. If the
 * reply never comes (a timeout, a killed script), the line is left "registering" or "unknown" and
 * the next pass ASKS Tucows what happened (get_orders_by_domain) instead of sending the order
 * again. Only a name Tucows has no order for, and that is still free, goes back to "new".
 *
 * CARD HOLDS LAST SEVEN DAYS. An order still pending on day six is settled anyway: registered and
 * still-pending names are charged, and CDR is told to check.
 */

require_once __DIR__ . '/opensrs.php';

const CDR_DRIVABLE = array('authorized', 'fulfilling', 'pending', 'settle_error');
const CDR_MAX_ATTEMPTS = 3;
const CDR_SETTLE_AFTER_SECONDS = 518400; // 6 days

/**
 * A finished Checkout Session, recorded on its order: the card must be AUTHORISED (PaymentIntent
 * "requires_capture") for the amount checkout.php computed, less any promotion code Stripe
 * applied. Anything else is flagged, CDR is told, and a wrong hold is released.
 *
 * Called by the webhook (with the event id, so a redelivery is a no-op) and by order-status.php
 * when the webhook is late (with the session read from Stripe). Acts only on a pending_payment
 * order. Returns the order, or false when Stripe could not be read (the caller retries).
 */
function cdr_record_checkout($orderId, $session, $eventId = null) {
    if (isset($session['status']) && $session['status'] !== 'complete') return cdr_read_order($orderId);
    $pi = null;
    if (!empty($session['payment_intent'])) {
        $piId = is_array($session['payment_intent']) ? $session['payment_intent']['id'] : $session['payment_intent'];
        list($http, $pi) = cdr_stripe('GET', '/payment_intents/' . rawurlencode($piId));
        if ($http !== 200 || !is_array($pi)) return false;
    }

    $notify = null;
    $order = cdr_update_order($orderId, function ($o) use ($eventId, $session, $pi, &$notify) {
        if ($eventId !== null) {
            if (in_array($eventId, $o['events'], true)) return null;
            $o['events'][] = $eventId;
        }
        if ($o['status'] !== 'pending_payment') return $eventId !== null ? $o : null;
        $o['stripe']['session_id'] = $session['id'];
        $o['stripe']['livemode'] = !empty($session['livemode']);
        $o['stripe']['customer'] = array(
            'email' => isset($session['customer_details']['email']) ? $session['customer_details']['email'] : null,
            'name' => isset($session['customer_details']['name']) ? $session['customer_details']['name'] : null,
        );
        $o['stripe']['amount_subtotal'] = isset($session['amount_subtotal']) ? (int) $session['amount_subtotal'] : -1;
        $o['stripe']['amount_discount'] = isset($session['total_details']['amount_discount']) ? (int) $session['total_details']['amount_discount'] : 0;
        if (!$pi) {
            $o['status'] = 'needs_review';
            $notify = 'no_payment';
            cdr_note($o, 'Checkout completed without a payment to hold.');
            return $o;
        }
        $o['stripe']['payment_intent'] = $pi['id'];
        $currency = isset($pi['currency']) ? $pi['currency'] : '';
        $expected = $o['stripe']['amount_subtotal'] - $o['stripe']['amount_discount'];

        if ($pi['status'] !== 'requires_capture') {
            $o['status'] = $pi['status'] === 'succeeded' ? 'needs_review' : 'payment_failed';
            $notify = $pi['status'] === 'succeeded' ? 'captured_early' : null;
            cdr_note($o, 'Payment is "' . $pi['status'] . '", not an authorisation waiting for capture.');
            return $o;
        }
        $o['stripe']['amount_authorized'] = (int) $pi['amount_capturable'];
        if ($o['stripe']['amount_subtotal'] !== $o['subtotal_cents'] || (int) $pi['amount_capturable'] !== $expected || $currency !== $o['currency']) {
            $o['status'] = 'amount_mismatch';
            $notify = 'mismatch';
            cdr_note($o, 'Stripe authorised ' . cdr_money((int) $pi['amount_capturable'], $currency) . ' against ' . cdr_money($expected, $o['currency']) . '. Releasing the hold.');
            return $o;
        }
        $o['status'] = 'authorized';
        $o['stripe']['authorized_at'] = gmdate('c');
        cdr_note($o, 'Card authorised for ' . cdr_money($expected, $o['currency']) . ($o['stripe']['amount_discount'] ? ' after a ' . cdr_money($o['stripe']['amount_discount'], $o['currency']) . ' promotion' : '') . '.');
        return $o;
    });

    if ($notify === 'mismatch') {
        cdr_stripe('POST', '/payment_intents/' . rawurlencode($order['stripe']['payment_intent']) . '/cancel', array(), 'cdr-cancel-' . $order['id']);
    }
    if ($notify) {
        $why = array(
            'mismatch' => 'Stripe authorised a different amount from the order total, so the card hold was released and nothing was registered.',
            'captured_early' => 'Stripe CHARGED the card at once instead of holding it (check the Stripe settings). Nothing was registered: register the domains by hand or refund the customer.',
            'no_payment' => 'Stripe reported a finished checkout with no payment attached. Nothing was registered.',
        );
        cdr_mail(cdr_config()['notify_email'], cdr_subject_prefix($order) . 'CHECK order ' . $order['id'], $why[$notify] . "\n\n" . cdr_order_summary($order));
    }
    return $order;
}

function cdr_line_final($line) {
    return in_array($line['state'], array('registered', 'failed'), true);
}

/** Drives one order as far as it can go in about $budget seconds. Returns the order's status. */
function cdr_fulfil($id, $budget = 20) {
    $path = cdr_order_path($id);
    if (!$path || !is_file($path)) return null;
    $lock = fopen($path . '.fulfil', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return 'busy';
    try {
        $order = cdr_read_order($id);
        if (!$order || !in_array($order['status'], CDR_DRIVABLE, true)) return $order ? $order['status'] : null;
        $started = time();

        if ($order['status'] !== 'settle_error') {
            if ($order['status'] === 'authorized') {
                $order = cdr_update_order($id, function ($o) { $o['status'] = 'fulfilling'; cdr_note($o, 'Fulfilment started.'); return $o; });
            }
            // Up to three rounds, so a lost reply is looked up (and a free name retried) in the same
            // pass. Names waiting on the registry (pending) are left for a later pass.
            for ($round = 0; $round < 3; $round++) {
                foreach (array_keys($order['lines']) as $i) {
                    if (time() - $started > $budget) break 2;
                    cdr_fulfil_line($id, $i);
                }
                $again = array_filter(cdr_read_order($id)['lines'], function ($l) { return in_array($l['state'], array('new', 'registering', 'unknown'), true); });
                if (!$again) break;
                sleep(2);
            }
        }
        return cdr_settle($id);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

/** Moves one line one step. Every result is written before the next Tucows call. */
function cdr_fulfil_line($id, $i) {
    $order = cdr_read_order($id);
    $line = $order['lines'][$i];
    if (cdr_line_final($line)) return;

    if ($line['state'] === 'new') {
        if ($line['attempts'] >= CDR_MAX_ATTEMPTS) {
            cdr_set_line($id, $i, array('state' => 'failed', 'reason' => 'error'), 'Gave up after ' . CDR_MAX_ATTEMPTS . ' attempts.');
            return;
        }
        cdr_set_line($id, $i, array('state' => 'registering', 'attempts' => $line['attempts'] + 1, 'attempted_at' => gmdate('c')), 'Registering at Tucows.');
        $r = cdr_opensrs_register($line['domain'], $line['term'], $order['registrant'], isset($order['registrant_ip']) ? $order['registrant_ip'] : '');
        $a = $r['attributes'];
        $tucows = array('order_id' => isset($a['id']) ? (string) $a['id'] : null, 'domain_id' => isset($a['domain_id']) ? (string) $a['domain_id'] : null, 'code' => $r['code'], 'text' => $r['text'], 'reg_username' => $r['reg_username']);
        $said = 'Tucows replied ' . ($r['transport'] ? $r['code'] . ' ' . $r['text'] : 'nothing (' . $r['error'] . ')') . '.';

        if (!$r['transport']) {
            cdr_set_line($id, $i, array('state' => 'unknown', 'opensrs' => $tucows), $said . ' Will ask Tucows what happened before trying again.');
        } elseif (!empty($a['forced_pending']) || $r['code'] === 440) {
            // Tucows parked the order (usually: not enough balance). It must not complete later
            // without payment, so the line fails and CDR is told to cancel it in the panel.
            cdr_set_line($id, $i, array('state' => 'failed', 'reason' => 'tucows_on_hold', 'opensrs' => $tucows), $said . ' Order put on hold by Tucows: cancel it in the Tucows panel.');
        } elseif ($r['code'] === 200) {
            cdr_set_line($id, $i, array('state' => 'registered', 'registered_at' => gmdate('c'), 'opensrs' => $tucows), $said);
        } elseif ($r['code'] === 250) {
            cdr_set_line($id, $i, array('state' => 'pending', 'opensrs' => $tucows), $said . ' The registry answers later.');
        } elseif ($r['code'] === 485 || $r['code'] === 211 || $r['code'] === 221) {
            cdr_set_line($id, $i, array('state' => 'failed', 'reason' => 'taken', 'opensrs' => $tucows), $said);
        } elseif ($r['code'] === 486) {
            cdr_set_line($id, $i, array('state' => 'unknown', 'opensrs' => $tucows), $said . ' A registration is in progress for this name; checking back.');
        } else {
            cdr_set_line($id, $i, array('state' => 'failed', 'reason' => 'rejected', 'opensrs' => $tucows), $said);
        }
        return;
    }

    if ($line['state'] === 'registering' || $line['state'] === 'unknown') {
        // What did the last attempt do? Only orders on this account from around that attempt count.
        $orders = cdr_opensrs_orders_for($line['domain']);
        if ($orders === null) return; // Tucows not reachable: try again on the next pass
        $since = isset($line['attempted_at']) ? strtotime($line['attempted_at']) - 86400 : 0;
        foreach ($orders as $o) {
            $when = strtotime($o['date']);
            if ($when !== false && $when < $since) continue;
            $tucows = isset($line['opensrs']) && is_array($line['opensrs']) ? $line['opensrs'] : array();
            $tucows['order_id'] = $o['id'];
            if ($o['status'] === 'completed') {
                cdr_set_line($id, $i, array('state' => 'registered', 'registered_at' => gmdate('c'), 'opensrs' => $tucows), 'Found Tucows order ' . $o['id'] . ', completed.');
                return;
            }
            if (in_array($o['status'], array('pending', 'waiting', 'processed'), true)) {
                cdr_set_line($id, $i, array('state' => 'pending', 'opensrs' => $tucows), 'Found Tucows order ' . $o['id'] . ', ' . $o['status'] . '.');
                return;
            }
        }
        // No live order of ours. If the name is still free, nothing happened and it is safe to retry.
        $look = cdr_opensrs_lookup($line['domain'], true);
        if ($look['status'] === 'available') {
            cdr_set_line($id, $i, array('state' => 'new'), 'No Tucows order found and the name is still free; will try again.');
        } elseif ($look['status'] === 'taken' || $look['status'] === 'premium') {
            cdr_set_line($id, $i, array('state' => 'failed', 'reason' => 'taken'), 'No Tucows order of ours, and the name is now taken.');
        }
        return;
    }

    if ($line['state'] === 'pending') {
        if (empty($line['opensrs']['order_id'])) { cdr_set_line($id, $i, array('state' => 'unknown'), 'Pending without an order id.'); return; }
        $status = cdr_opensrs_order_status($line['opensrs']['order_id']);
        if ($status === 'completed') cdr_set_line($id, $i, array('state' => 'registered', 'registered_at' => gmdate('c')), 'Tucows order completed.');
        elseif (in_array($status, array('declined', 'cancelled', 'deleted'), true)) cdr_set_line($id, $i, array('state' => 'failed', 'reason' => 'rejected'), 'Tucows order ' . $status . '.');
    }
}

function cdr_set_line($id, $i, $fields, $note) {
    return cdr_update_order($id, function ($o) use ($i, $fields, $note) {
        foreach ($fields as $k => $v) $o['lines'][$i][$k] = $v;
        cdr_note($o, $o['lines'][$i]['domain'] . ': ' . $note);
        return $o;
    });
}

/** When every line is final (or the hold is about to lapse), take the money for what registered
 *  and release the rest, then email the customer and CDR once. */
function cdr_settle($id) {
    $order = cdr_read_order($id);
    $states = array_map(function ($l) { return $l['state']; }, $order['lines']);
    $open = array_diff($states, array('registered', 'failed'));
    $age = time() - strtotime(isset($order['stripe']['authorized_at']) ? $order['stripe']['authorized_at'] : $order['created_at']);
    $forced = $open && $age > CDR_SETTLE_AFTER_SECONDS;

    if ($open && !$forced) {
        $status = in_array('new', $states, true) ? 'fulfilling' : 'pending';
        if ($order['status'] !== $status) cdr_update_order($id, function ($o) use ($status) { $o['status'] = $status; return $o; });
        return $status;
    }

    // What is charged: registered lines, plus on a forced settle the ones Tucows may still complete
    // (pending, or sent with the reply lost). A line never sent ("new") is not charged.
    $chargeable = 0;
    foreach ($order['lines'] as $l) {
        if ($l['state'] === 'registered' || ($forced && in_array($l['state'], array('pending', 'registering', 'unknown'), true))) $chargeable += $l['amount_cents'];
    }
    $authorized = (int) $order['stripe']['amount_authorized'];
    // A promotion code discounts the whole order; the capture keeps the same proportion.
    $capture = $order['subtotal_cents'] > 0 ? (int) round($authorized * $chargeable / $order['subtotal_cents']) : 0;
    $capture = min($capture, $authorized);
    $pi = $order['stripe']['payment_intent'];

    if ($capture > 0) {
        list($http, $body) = cdr_stripe('POST', '/payment_intents/' . rawurlencode($pi) . '/capture', array('amount_to_capture' => $capture), 'cdr-capture-' . $id);
        $ok = $http === 200 && isset($body['status']) && $body['status'] === 'succeeded';
    } else {
        list($http, $body) = cdr_stripe('POST', '/payment_intents/' . rawurlencode($pi) . '/cancel', array('cancellation_reason' => 'abandoned'), 'cdr-cancel-' . $id);
        $ok = $http === 200 && isset($body['status']) && $body['status'] === 'canceled';
    }

    if (!$ok) {
        $message = isset($body['error']['message']) ? $body['error']['message'] : 'HTTP ' . $http;
        $first = $order['status'] !== 'settle_error';
        cdr_update_order($id, function ($o) use ($message) { $o['status'] = 'settle_error'; $o['stripe']['settle_error'] = $message; cdr_note($o, 'Stripe settle failed: ' . $message); return $o; });
        if ($first) cdr_mail(cdr_config()['notify_email'], cdr_subject_prefix($order) . 'CHECK order ' . $id . ': Stripe could not settle the card hold', "Stripe said: " . $message . "\n\nThe cron job keeps retrying. Check the payment in the Stripe dashboard.\n\n" . cdr_order_summary(cdr_read_order($id)));
        return 'settle_error';
    }

    $registered = count(array_filter($order['lines'], function ($l) { return $l['state'] === 'registered'; }));
    // A forced settle leaves names Tucows may still complete or decline. The money is already
    // taken, so the order stops being driven automatically and CDR checks it by hand.
    $status = $forced ? 'needs_review' : ($capture === 0 ? 'failed' : ($registered === count($order['lines']) ? 'registered' : 'partially_registered'));
    $order = cdr_update_order($id, function ($o) use ($capture, $status, $forced) {
        $o['status'] = $status;
        $o['stripe']['amount_captured'] = $capture;
        $o['stripe']['settled_at'] = gmdate('c');
        unset($o['stripe']['settle_error']);
        if ($forced) $o['settled_early'] = true;
        cdr_note($o, $capture ? 'Captured ' . cdr_money($capture, $o['currency']) . '.' : 'Nothing registered: card hold released.');
        return $o;
    });
    cdr_send_final_emails($order);
    return $status;
}

function cdr_subject_prefix($order) {
    return !empty($order['test_mode']) ? '[TEST] ' : '';
}

function cdr_term_words($term) {
    return $term . ($term === 1 ? ' year' : ' years');
}

function cdr_reason_words($reason) {
    $words = array(
        'taken' => 'someone else registered it first',
        'tucows_on_hold' => 'the registry could not process it',
        'rejected' => 'the registry did not accept it',
        'error' => 'the registry could not be reached',
    );
    return isset($words[$reason]) ? $words[$reason] : 'the registry did not accept it';
}

/** The facts of an order as plain text, for CDR's own notices. */
function cdr_order_summary($o) {
    $r = $o['registrant'];
    $lines = array();
    $lines[] = 'Order: ' . $o['id'] . (!empty($o['test_mode']) ? ' (TEST: no real money, Tucows ' . $o['opensrs_env'] . ')' : '');
    $lines[] = 'Status: ' . $o['status'];
    $lines[] = 'Order total: ' . cdr_money($o['subtotal_cents'], $o['currency']) . (isset($o['stripe']['amount_authorized']) ? ', card authorised for ' . cdr_money($o['stripe']['amount_authorized'], $o['currency']) : '') . (isset($o['stripe']['amount_captured']) ? ', captured ' . cdr_money($o['stripe']['amount_captured'], $o['currency']) : '');
    $lines[] = 'Stripe payment: ' . (isset($o['stripe']['payment_intent']) ? $o['stripe']['payment_intent'] : 'n/a');
    $lines[] = '';
    foreach ($o['lines'] as $l) {
        $tid = !empty($l['opensrs']['order_id']) ? ', Tucows order ' . $l['opensrs']['order_id'] : '';
        $lines[] = '- ' . $l['domain'] . ', ' . cdr_term_words($l['term']) . ', ' . cdr_money($l['amount_cents'], $o['currency']) . ': ' . strtoupper($l['state']) . (!empty($l['reason']) ? ' (' . $l['reason'] . ')' : '') . $tid;
    }
    $lines[] = '';
    $lines[] = 'Registrant:';
    $lines[] = $r['first_name'] . ' ' . $r['last_name'] . ($r['org_name'] !== '' ? ', ' . $r['org_name'] : '');
    $lines[] = $r['address1'] . ($r['address2'] !== '' ? ', ' . $r['address2'] : '');
    $lines[] = $r['city'] . ($r['state'] !== '' ? ', ' . $r['state'] : '') . ' ' . $r['postal_code'] . ', ' . $r['country'];
    $lines[] = $r['email'] . ', ' . $r['phone'];
    $lines[] = 'Ordered from IP ' . (isset($o['registrant_ip']) ? $o['registrant_ip'] : '?') . ' at ' . $o['created_at'];
    $lines[] = '';
    $lines[] = 'The full record is on the admin page: ' . cdr_config()['site_url'] . '/api/admin/';
    return implode("\n", $lines) . "\n";
}

function cdr_send_final_emails($o) {
    if (!empty($o['notified_final'])) return;
    $c = cdr_config();
    $registered = array_values(array_filter($o['lines'], function ($l) { return $l['state'] === 'registered'; }));
    $failed = array_values(array_filter($o['lines'], function ($l) { return $l['state'] === 'failed'; }));
    $waiting = array_values(array_filter($o['lines'], function ($l) { return !in_array($l['state'], array('registered', 'failed'), true); }));
    $captured = isset($o['stripe']['amount_captured']) ? (int) $o['stripe']['amount_captured'] : 0;

    // To the customer, in plain words.
    $b = array();
    $b[] = 'Hi ' . $o['registrant']['first_name'] . ',';
    $b[] = '';
    if ($registered) {
        $b[] = 'Thank you for your order. ' . (count($registered) === 1 ? 'This domain is now registered to you:' : 'These domains are now registered to you:');
        foreach ($registered as $l) $b[] = '  ' . $l['domain'] . ' (' . cdr_term_words($l['term']) . ')';
        $b[] = '';
    }
    if ($waiting) {
        $b[] = 'The registry is still processing:';
        foreach ($waiting as $l) $b[] = '  ' . $l['domain'];
        $b[] = 'We will email you if anything changes.';
        $b[] = '';
    }
    if ($failed) {
        $b[] = ($registered ? 'We could not register:' : 'We are sorry, we could not register your order:');
        foreach ($failed as $l) $b[] = '  ' . $l['domain'] . ' (' . cdr_reason_words(isset($l['reason']) ? $l['reason'] : '') . ')';
        $b[] = 'You are not charged for ' . (count($failed) === 1 ? 'it' : 'these') . '.';
        $b[] = '';
    }
    $b[] = $captured > 0
        ? 'Amount charged to your card: ' . cdr_money($captured, $o['currency']) . '.'
        : 'Nothing was charged. The hold on your card has been released; depending on your bank it can take a few days to disappear from your statement.';
    if ($registered) {
        $b[] = '';
        $b[] = 'Our registry partner, Tucows (OpenSRS), may send you an email asking you to confirm your contact details. Please answer it within 15 days, or the domain can be suspended.';
    }
    $b[] = '';
    $b[] = 'Order number: ' . $o['id'];
    $b[] = 'Questions? Reply to this email or write to ' . $c['notify_email'] . '.';
    $b[] = '';
    $b[] = 'Corporate Domain Registry';
    $b[] = $c['site_url'];
    $subject = $registered ? 'Your domain order ' . $o['id'] . ' is complete' : 'Your domain order ' . $o['id'] . ' could not be completed';
    cdr_mail($o['registrant']['email'], cdr_subject_prefix($o) . $subject, implode("\n", $b) . "\n");

    // To CDR.
    $what = $o['status'] === 'registered' ? 'New order' : ($o['status'] === 'failed' ? 'FAILED order' : 'CHECK order');
    $intro = '';
    foreach ($o['lines'] as $l) {
        if (isset($l['reason']) && $l['reason'] === 'tucows_on_hold') $intro .= 'Tucows put ' . $l['domain'] . ' on hold (usually not enough balance). Cancel that order in the Tucows panel so it does not register without payment, and top up the balance.' . "\n";
    }
    if (!empty($o['settled_early'])) $intro .= "The card hold was about to expire, so the order was charged while some names were still pending at Tucows. Check them in the Tucows panel.\n";
    cdr_mail($c['notify_email'], cdr_subject_prefix($o) . $what . ' ' . $o['id'] . ', ' . cdr_money($captured, $o['currency']), ($intro !== '' ? $intro . "\n" : '') . cdr_order_summary($o));

    cdr_update_order($o['id'], function ($x) { $x['notified_final'] = gmdate('c'); return $x; });
}
