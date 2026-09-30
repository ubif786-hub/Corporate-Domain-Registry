<?php
/* Corporate Domain Registry: the shop configuration.
 *
 * WHERE THIS FILE GOES: rename it to cdr-config.php and put it in the HOME folder, the one that
 * CONTAINS public_html, never inside public_html. Anything inside public_html can be requested by
 * a browser; the folder above it cannot.
 *
 *   /home/<your cPanel user>/cdr-config.php      <- here
 *   /home/<your cPanel user>/public_html/        <- the website
 *
 * Orders are saved as files in a folder named cdr-orders beside it, created automatically.
 *
 * Keep the quotes around each value. Nothing in this file is ever shown to a visitor. Never paste
 * these values into an email or a chat.
 */
return array(
    // Stripe dashboard, Developers, API keys: the SECRET key. Test keys start sk_test_, live keys
    // sk_live_. Never mix a live Stripe key with the Tucows test system, or the reverse.
    'stripe_secret_key' => 'sk_test_PASTE_HERE',

    // Stripe dashboard, Developers, Webhooks, your endpoint, "Signing secret". Starts whsec_.
    // The endpoint is https://www.corporatedomainregistry.com/api/stripe-webhook/ and listens for
    // checkout.session.completed, checkout.session.expired and checkout.session.async_payment_failed.
    'stripe_webhook_secret' => 'whsec_PASTE_HERE',

    // Where new-order notices are emailed.
    'notify_email' => 'info@corporatedomainregistry.com',

    // The address the site answers on, no trailing slash. Stripe sends customers back here.
    'site_url' => 'https://www.corporatedomainregistry.com',

    // The sender of the emails. An address on your own domain is the one mail servers trust.
    'from_email' => 'no-reply@corporatedomainregistry.com',

    // How emails are sent: 'mail' on cPanel (its own mail server). On a DigitalOcean server,
    // whose mail ports are blocked, 'resend' with a Resend API key (resend.com; the sender's
    // domain must be verified there first).
    'mail_transport' => 'mail',
    'resend_api_key' => '',

    // Tucows (OpenSRS). 'test' is the Horizon test system (fake money); 'live' registers for real.
    // The username is the reseller username; the key is on Account Settings, API Settings, in the
    // matching panel (manage.test.opensrs.com for test, manage.opensrs.com for live). Live calls
    // are only accepted from the server IPs listed under IP Access Rules in the live panel.
    'opensrs_env' => 'test',
    'opensrs_username' => 'PASTE_RESELLER_USERNAME',
    'opensrs_api_key' => 'PASTE_API_KEY',

    // Nameservers for new domains. Leave empty to use the account's defaults (Tucows panel,
    // Account Settings). On the test system use array('ns1.systemdns.com', 'ns2.systemdns.com').
    'opensrs_nameservers' => array(),

    // Canadians pay in CAD. 1 means the same figures as USD ($60 US = $60 CAD).
    'cad_rate' => 1,

    // The password for /api/admin/, the order list. At least 16 characters; make it long and random.
    'admin_token' => 'PASTE_A_LONG_RANDOM_PASSWORD',

    // Signs the link that shows a customer their own order. Any long random text; never change it
    // while orders are in progress.
    'order_secret' => 'PASTE_ANOTHER_LONG_RANDOM_TEXT',

    // Only needed if the cron job is called over the web instead of cPanel's Cron Jobs.
    'cron_token' => '',
);
