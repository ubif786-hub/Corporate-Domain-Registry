<?php
/* Corporate Domain Registry: the payment configuration.
 *
 * WHERE THIS FILE GOES: rename it to cdr-config.php and put it in your cPanel HOME folder, the one
 * that CONTAINS public_html, never inside public_html. Anything inside public_html can be
 * requested by a browser; the folder above it cannot.
 *
 *   /home/<your cPanel user>/cdr-config.php      <- here
 *   /home/<your cPanel user>/public_html/        <- the website
 *
 * Paid orders are saved as files in a folder named cdr-orders beside it, created automatically.
 *
 * Keep the quotes around each value. Nothing in this file is ever shown to a visitor.
 */
return array(
    // Stripe dashboard, Developers, API keys: the SECRET key. Test keys start sk_test_, live keys
    // sk_live_. Use a test key until domain registration is connected.
    'stripe_secret_key' => 'sk_test_PASTE_HERE',

    // Stripe dashboard, Developers, Webhooks, your endpoint, "Signing secret". Starts whsec_.
    'stripe_webhook_secret' => 'whsec_PASTE_HERE',

    // Where paid-order notices are emailed.
    'notify_email' => 'support@corporatedomainregistry.com',

    // The address the site answers on, no trailing slash. Stripe sends customers back here.
    'site_url' => 'https://www.corporatedomainregistry.com',

    // The sender of the notices. An address on your own domain is the one mail servers trust.
    'from_email' => 'no-reply@corporatedomainregistry.com',
);
