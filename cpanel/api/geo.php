<?php
/* Where the visitor appears to be, for the header chip and its location panel.
 *
 * THE SAME ANSWER, IN THE SAME SHAPE, AS src/app/api/geo/route.ts. On Vercel the country, city and
 * region arrive as request headers the platform stamps on; on the client's own cPanel hosting
 * nothing stamps them, so this script looks the visitor's address up in an IP database that sits
 * beside it (geo/dbip-city-lite.mmdb). The page asks /api/geo exactly as it always has; the
 * .htaccess at the site root routes that path here.
 *
 * FIVE FIELDS: country (ISO two-letter, which is what picks the region, the logo and the
 * currency), city, region, ip, host. Any field that cannot be resolved is null, and the page
 * already treats null as "unknown" and falls back to the default region. NOTHING HERE MAY THROW
 * AT THE VISITOR: a missing database, an unreadable one or a private address all answer 200 with
 * nulls, because an unanswered geo is not an error a visitor can fix.
 *
 * SHOWING SOMEBODY THEIR OWN IP IS NOT A DISCLOSURE, KEEPING IT WOULD BE. No logging, no storage,
 * no cookies, and no-store so the answer never sits in a cache.
 *
 * Runs on PHP 7.2 and later with no extensions beyond the defaults. The reader under lib/ is
 * MaxMind's, Apache 2.0, pure PHP. The database is DB-IP's IP to City Lite, CC BY 4.0, which asks
 * for a credit wherever its data is shown; refresh it monthly (cpanel/README.md).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function visitor_ip() {
    // Behind a proxy or CDN the visitor is the FIRST entry of x-forwarded-for; taking the last, or
    // the whole string, yields a proxy address and a panel that is confidently wrong. GoDaddy's
    // shared hosting normally has no proxy in front, so REMOTE_ADDR is the visitor.
    $candidates = array();
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) $candidates[] = $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $candidates[] = trim($parts[0]);
    }
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) $candidates[] = $_SERVER['HTTP_X_REAL_IP'];
    if (!empty($_SERVER['REMOTE_ADDR'])) $candidates[] = $_SERVER['REMOTE_ADDR'];
    foreach ($candidates as $c) {
        // A forwarded header is visitor-controlled text: accept only a public address from it.
        if (filter_var($c, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return $c;
    }
    $last = end($candidates);
    return ($last && filter_var($last, FILTER_VALIDATE_IP)) ? $last : null;
}

function name_of($node) {
    if (!is_array($node) || empty($node['names']) || !is_array($node['names'])) return null;
    if (!empty($node['names']['en'])) return $node['names']['en'];
    $first = reset($node['names']);
    return $first ? $first : null;
}

/* The approved build shows the subdivision CODE ("ON", "FL"), because that is what Vercel's header
 * carries. The free database carries the NAME, so Canada's and the United States' are mapped back
 * to their codes here; anywhere else the name is what Vercel's code would have been shorthand for,
 * and the name reads better than a code nobody recognises. */
function region_code($country, $name) {
    static $CA = array('Alberta'=>'AB','British Columbia'=>'BC','Manitoba'=>'MB','New Brunswick'=>'NB','Newfoundland and Labrador'=>'NL','Northwest Territories'=>'NT','Nova Scotia'=>'NS','Nunavut'=>'NU','Ontario'=>'ON','Prince Edward Island'=>'PE','Quebec'=>'QC','Québec'=>'QC','Saskatchewan'=>'SK','Yukon'=>'YT');
    static $US = array('Alabama'=>'AL','Alaska'=>'AK','Arizona'=>'AZ','Arkansas'=>'AR','California'=>'CA','Colorado'=>'CO','Connecticut'=>'CT','Delaware'=>'DE','District of Columbia'=>'DC','Florida'=>'FL','Georgia'=>'GA','Hawaii'=>'HI','Idaho'=>'ID','Illinois'=>'IL','Indiana'=>'IN','Iowa'=>'IA','Kansas'=>'KS','Kentucky'=>'KY','Louisiana'=>'LA','Maine'=>'ME','Maryland'=>'MD','Massachusetts'=>'MA','Michigan'=>'MI','Minnesota'=>'MN','Mississippi'=>'MS','Missouri'=>'MO','Montana'=>'MT','Nebraska'=>'NE','Nevada'=>'NV','New Hampshire'=>'NH','New Jersey'=>'NJ','New Mexico'=>'NM','New York'=>'NY','North Carolina'=>'NC','North Dakota'=>'ND','Ohio'=>'OH','Oklahoma'=>'OK','Oregon'=>'OR','Pennsylvania'=>'PA','Rhode Island'=>'RI','South Carolina'=>'SC','South Dakota'=>'SD','Tennessee'=>'TN','Texas'=>'TX','Utah'=>'UT','Vermont'=>'VT','Virginia'=>'VA','Washington'=>'WA','West Virginia'=>'WV','Wisconsin'=>'WI','Wyoming'=>'WY');
    if ($country === 'CA' && isset($CA[$name])) return $CA[$name];
    if ($country === 'US' && isset($US[$name])) return $US[$name];
    return $name;
}

$ip = visitor_ip();
$out = array(
    'country' => null,
    'city' => null,
    'region' => null,
    'ip' => $ip,
    'host' => isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^A-Za-z0-9.:\-\[\]]/', '', $_SERVER['HTTP_HOST']) : null,
);

$db = __DIR__ . '/geo/dbip-city-lite.mmdb';
if ($ip && is_readable($db)) {
    try {
        require_once __DIR__ . '/lib/MaxMind/Db/Reader.php';
        require_once __DIR__ . '/lib/MaxMind/Db/Reader/Decoder.php';
        require_once __DIR__ . '/lib/MaxMind/Db/Reader/InvalidDatabaseException.php';
        require_once __DIR__ . '/lib/MaxMind/Db/Reader/Metadata.php';
        require_once __DIR__ . '/lib/MaxMind/Db/Reader/Util.php';
        $reader = new \MaxMind\Db\Reader($db);
        $rec = $reader->get($ip);
        $reader->close();
        if (is_array($rec)) {
            if (!empty($rec['country']['iso_code'])) $out['country'] = strtoupper($rec['country']['iso_code']);
            // The database appends a district in brackets ("Toronto (Old Toronto)"); the panel shows a city.
            $city = name_of(isset($rec['city']) ? $rec['city'] : null);
            $out['city'] = $city ? trim(preg_replace('/\s*\([^)]*\)\s*$/', '', $city)) : null;
            // Vercel's region header is the subdivision CODE ("ON", "FL"); prefer the code and fall
            // back to the name, so the panel reads the way the approved build reads.
            if (!empty($rec['subdivisions'][0])) {
                $sub = $rec['subdivisions'][0];
                $out['region'] = !empty($sub['iso_code']) ? $sub['iso_code'] : region_code($out['country'], name_of($sub));
            }
        }
    } catch (\Throwable $e) {
        // Fall through with nulls: the page shows the default region.
    } catch (\Exception $e) {
        // PHP 5-era catch order kept harmlessly; \Throwable above covers PHP 7 and later.
    }
}

echo json_encode($out);
