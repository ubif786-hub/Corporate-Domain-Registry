<?php
/* LOCAL TESTING ONLY. Never uploaded: the export script copies cpanel/api and nothing else.
 *
 * PHP's built-in server does not read .htaccess, so this router says the same things to it that
 * the generated .htaccess says to Apache: /api/geo, /api/checkout and /api/stripe-webhook go to
 * their scripts (which find cdr-config.php one folder above out/, the repo root), the database and the
 * library are forbidden, the redirects come from redirects.json, a folder serves its index.html,
 * a path with no trailing slash is redirected to the one with (Apache's DirectorySlash), and a
 * miss serves 404.html with a 404.
 *
 *   php -S 127.0.0.1:8099 -t out cpanel/local-router.php
 *
 * It proves the PAGES and the PHP. It does not prove the .htaccess itself; that is checked with
 * curl against the real host after the first upload (cpanel/README.md).
 */
$root = $_SERVER['DOCUMENT_ROOT'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);

if (preg_match('#^/api/geo/?$#', $uri)) { require $root . '/api/geo.php'; return true; }
// Only in a --payments export, as the generated .htaccess only has these rules then; otherwise 404.
if (preg_match('#^/api/checkout/?$#', $uri) && is_file($root . '/api/checkout.php')) { require $root . '/api/checkout.php'; return true; }
if (preg_match('#^/api/stripe-webhook/?$#', $uri) && is_file($root . '/api/stripe-webhook.php')) { require $root . '/api/stripe-webhook.php'; return true; }
if (preg_match('#^/api/(geo|lib)/#', $uri)) { http_response_code(403); echo 'Forbidden'; return true; }

$redirects = json_decode(file_get_contents(__DIR__ . '/../redirects.json'), true);
foreach ($redirects as $r) {
    $pat = ltrim($r['source'], '/');
    if (preg_match('#/:\w+\*$#', $pat)) $pat = preg_replace('#/:\w+\*$#', '(/.*)?', $pat);
    elseif (preg_match('#/:\w+$#', $pat)) $pat = preg_replace('#/:\w+$#', '/[^/]+/?', $pat);
    else $pat .= '/?';
    if (preg_match('#^/' . $pat . '$#', $uri)) {
        header('Location: ' . $r['destination'] . '/', true, $r['permanent'] ? 308 : 302);
        return true;
    }
}

$path = $root . $uri;
if (is_dir($path)) {
    if (substr($uri, -1) !== '/') { header('Location: ' . $uri . '/' . ($query ? '?' . $query : ''), true, 301); return true; }
    if (is_file($path . 'index.html')) { header('Content-Type: text/html; charset=utf-8'); readfile($path . 'index.html'); return true; }
}
if (is_file($path)) return false; // let the built-in server send it with its own content type

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
readfile($root . '/404.html');
return true;
