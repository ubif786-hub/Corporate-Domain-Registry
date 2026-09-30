<?php
/* GET /api/domain-check/?domain=example.com — is it free, and what does it cost here.
 *
 * Answers 200 with one of these statuses, so the page has one shape to read:
 *   available    free to register; prices holds the ladder in the visitor's currency
 *   taken        registered already (or a registration is waiting for it)
 *   premium      a registry premium name: not sold online
 *   unsupported  an extension the shop does not sell online (catalog.json "sellable")
 *   invalid      not a domain name
 *   error        Tucows did not answer; the page offers a retry
 * and 429 when one visitor searches too fast (OpenSRS agreement 3.2 forbids bulk lookups).
 *
 * The answer is a snapshot: api/checkout.php checks every domain again, straight at the
 * registry, before any card is touched.
 */
require __DIR__ . '/lib/cdr.php';
require __DIR__ . '/lib/opensrs.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    cdr_fail(405, 'method', 'Use GET.');
}

$domain = cdr_normalise_domain(isset($_GET['domain']) ? $_GET['domain'] : '');
$currency = cdr_visitor_currency();
$out = array('domain' => $domain, 'status' => 'invalid', 'currency' => strtoupper($currency));

if (!cdr_valid_domain($domain)) cdr_json(200, $out);
if (!cdr_sellable($domain)) cdr_json(200, array('status' => 'unsupported') + $out);

cdr_require_config(array('opensrs_username', 'opensrs_api_key'));
if (cdr_rate_limited('check', 30, 60)) {
    cdr_fail(429, 'too_many', 'Too many searches in a row. Wait a minute and try again.');
}

$look = cdr_opensrs_lookup($domain);
$out['status'] = $look['status'];
if ($look['status'] === 'available') {
    $prices = array();
    foreach (cdr_catalog()['terms'] as $t) $prices[(string) $t] = cdr_price_cents($t, $currency) / 100;
    $out['prices'] = $prices;
}
$out['checked_at'] = gmdate('c');
cdr_json(200, $out);
