<?php
/* The background job, every 5 minutes. It finishes what the webhook and the done page left:
 *   - orders still registering or waiting on the registry (Tucows answers some later)
 *   - orders whose capture failed (Stripe retried)
 *   - orders whose card hold is about to lapse (settled on day six, lib/fulfil.php)
 *   - checkouts whose webhook never arrived (the session is read from Stripe)
 *
 * cPanel, Cron Jobs, every 5 minutes (the path is the site's own folder):
 *   php /home/<cPanel user>/public_html/api/cron.php >/dev/null 2>&1
 *
 * Over HTTP it answers only with the cron_token from cdr-config.php:
 *   https://www.corporatedomainregistry.com/api/cron/?token=<cron_token>
 */
require __DIR__ . '/lib/cdr.php';
require __DIR__ . '/lib/fulfil.php';

$cli = PHP_SAPI === 'cli';
$config = cdr_config();
if (!$cli) {
    $token = isset($_GET['token']) ? (string) $_GET['token'] : '';
    if ($config['cron_token'] === '' || !hash_equals($config['cron_token'], $token)) cdr_fail(404, 'not_found', 'Not found.');
}
cdr_require_config(array('stripe_secret_key', 'site_url', 'notify_email', 'opensrs_username', 'opensrs_api_key'));
@set_time_limit($cli ? 280 : 60);
$budget = $cli ? 240 : 25;
$started = time();
$report = array();

foreach (cdr_order_ids() as $id) {
    if (time() - $started > $budget) { $report[] = 'out of time; the next run continues'; break; }
    $order = cdr_read_order($id);
    if (!$order) continue;

    if ($order['status'] === 'pending_payment' && !empty($order['stripe']['session_id']) && time() - strtotime($order['created_at']) > 300) {
        list($http, $session) = cdr_stripe('GET', '/checkout/sessions/' . rawurlencode($order['stripe']['session_id']));
        if ($http === 200 && isset($session['status'])) {
            if ($session['status'] === 'complete') {
                $o = cdr_record_checkout($id, $session);
                if ($o) $report[] = $id . ': payment found without a webhook, now ' . $o['status'];
            } elseif ($session['status'] === 'expired') {
                cdr_update_order($id, function ($o) {
                    if ($o['status'] !== 'pending_payment') return null;
                    $o['status'] = 'expired';
                    cdr_note($o, 'Checkout expired without payment.');
                    return $o;
                });
            }
        }
        $order = cdr_read_order($id);
    }

    if (in_array($order['status'], CDR_DRIVABLE, true)) {
        $status = cdr_fulfil($id, 30);
        $report[] = $id . ': ' . $order['status'] . ' -> ' . $status;
    }
}

cdr_json(200, array('ran_at' => gmdate('c'), 'report' => $report));
