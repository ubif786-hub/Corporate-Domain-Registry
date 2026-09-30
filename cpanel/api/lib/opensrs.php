<?php
/* Tucows / OpenSRS, over the XML API. No SDK and no simplexml (the host does not have it): the
 * request is built as a string and the reply is read with DOMDocument.
 *
 *   test (Horizon)  https://horizon.opensrs.net:55443      fake money, fake registrations
 *   live            https://rr-n1-tor.opensrs.net:55443   real money; the caller's IP must be on
 *                                                         the account's IP Access Rules
 *
 * Every request is signed: X-Signature = md5(md5(xml . key) . key). The key is read from
 * cdr-config.php and never logged, printed or stored anywhere else.
 *
 * ALWAYS BRANCH ON response_code. is_success is 1 for "domain taken" too, because the query
 * itself succeeded (research/opensrs/lookup-domain.md).
 */

function cdr_opensrs_endpoint() {
    if (cdr_config()['opensrs_url'] !== '') return cdr_config()['opensrs_url'];
    return cdr_config()['opensrs_env'] === 'live'
        ? 'https://rr-n1-tor.opensrs.net:55443'
        : 'https://horizon.opensrs.net:55443';
}

/** A PHP value as OPS XML: a list becomes dt_array, a keyed array dt_assoc, anything else text. */
function cdr_opensrs_encode($value) {
    if (!is_array($value)) return htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    // An empty array is an empty attributes block, which OpenSRS expects as dt_assoc.
    $isList = $value !== array() && array_keys($value) === range(0, count($value) - 1);
    $tag = $isList ? 'dt_array' : 'dt_assoc';
    $xml = '<' . $tag . '>';
    foreach ($value as $k => $v) {
        $xml .= '<item key="' . htmlspecialchars((string) $k, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '">' . cdr_opensrs_encode($v) . '</item>';
    }
    return $xml . '</' . $tag . '>';
}

/** $extra: further top-level request parameters, such as registrant_ip, which the docs put
 *  beside action and object rather than inside attributes. */
function cdr_opensrs_envelope($action, $object, $attributes, $extra = array()) {
    $body = array('protocol' => 'XCP', 'action' => $action, 'object' => $object) + $extra + array('attributes' => $attributes);
    return "<?xml version='1.0' encoding='UTF-8' standalone='no' ?>\n"
        . "<!DOCTYPE OPS_envelope SYSTEM 'ops.dtd'>\n"
        . '<OPS_envelope><header><version>0.9</version></header><body><data_block>'
        . cdr_opensrs_encode($body)
        . '</data_block></body></OPS_envelope>';
}

/** The reply's data_block as a PHP array, or null when it is not an OPS envelope. */
function cdr_opensrs_decode($xml) {
    if (!is_string($xml) || $xml === '') return null;
    $doc = new DOMDocument();
    $prev = libxml_use_internal_errors(true);
    // No network, no entity expansion: the DOCTYPE names ops.dtd and nothing may fetch it.
    $ok = $doc->loadXML($xml, LIBXML_NONET);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    if (!$ok) return null;
    $blocks = $doc->getElementsByTagName('data_block');
    if (!$blocks->length) return null;
    foreach ($blocks->item(0)->childNodes as $child) {
        if ($child instanceof DOMElement) return cdr_opensrs_node($child);
    }
    return null;
}

function cdr_opensrs_node(DOMElement $el) {
    if ($el->tagName === 'dt_assoc' || $el->tagName === 'dt_array') {
        $out = array();
        foreach ($el->childNodes as $item) {
            if (!($item instanceof DOMElement) || $item->tagName !== 'item') continue;
            $out[$item->getAttribute('key')] = cdr_opensrs_item($item);
        }
        return $out;
    }
    return $el->textContent;
}

function cdr_opensrs_item(DOMElement $item) {
    foreach ($item->childNodes as $child) {
        if ($child instanceof DOMElement) return cdr_opensrs_node($child);
    }
    return $item->textContent;
}

/**
 * One API call. Returns:
 *   transport  true when a readable reply came back; false on a timeout, a refused connection or
 *              an unreadable body (the command MAY still have run: see cdr_fulfil_line())
 *   code       response_code as an int (0 when there is no reply)
 *   text       response_text
 *   success    is_success
 *   attributes the reply's attributes array
 *   error      a short transport error, never containing the key
 */
function cdr_opensrs_call($action, $attributes, $object = 'DOMAIN', $timeout = 25, $extra = array()) {
    $c = cdr_config();
    $xml = cdr_opensrs_envelope($action, $object, $attributes, $extra);
    $signature = md5(md5($xml . $c['opensrs_api_key']) . $c['opensrs_api_key']);
    $ch = curl_init(cdr_opensrs_endpoint());
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $xml,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HTTPHEADER => array(
            'Content-Type: text/xml',
            'X-Username: ' . $c['opensrs_username'],
            'X-Signature: ' . $signature,
        ),
    ));
    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $out = array('transport' => false, 'code' => 0, 'text' => '', 'success' => false, 'attributes' => array(), 'error' => '', 'http' => $http);
    if ($errno) {
        $out['error'] = $errno === CURLE_OPERATION_TIMEDOUT ? 'timeout' : 'connection error ' . $errno;
        return $out;
    }
    $reply = cdr_opensrs_decode($raw);
    if (!is_array($reply) || !isset($reply['response_code'])) {
        $out['error'] = 'unreadable reply (HTTP ' . $http . ')';
        return $out;
    }
    $out['transport'] = true;
    $out['code'] = (int) $reply['response_code'];
    $out['text'] = isset($reply['response_text']) ? (string) $reply['response_text'] : '';
    $out['success'] = !empty($reply['is_success']);
    $out['attributes'] = isset($reply['attributes']) && is_array($reply['attributes']) ? $reply['attributes'] : array();
    return $out;
}

/**
 * Is the domain free to register? Returns array(status, code, text), status one of:
 *   available  210, and not a registry premium name
 *   taken      211 or 221 (a waiting registration exists)
 *   premium    a registry premium name: priced by the registry, not sold here (plan D6)
 *   error      anything else, including no reply; the page offers a retry
 * 486 means a registration is being processed for the name somewhere; one retry settles it.
 */
function cdr_opensrs_lookup($domain, $noCache = false) {
    $attrs = array('domain' => $domain);
    if ($noCache) $attrs['no_cache'] = 1;
    for ($try = 0; $try < 2; $try++) {
        $r = cdr_opensrs_call('LOOKUP', $attrs, 'DOMAIN', 15);
        if ($r['code'] !== 486) break;
        sleep(2);
    }
    $reason = isset($r['attributes']['reason']) ? (string) $r['attributes']['reason'] : '';
    if (!$r['transport']) $status = 'error';
    elseif (stripos($reason, 'premium') !== false) $status = 'premium';
    elseif ($r['code'] === 210) $status = 'available';
    elseif ($r['code'] === 211 || $r['code'] === 221) $status = 'taken';
    else $status = 'error';
    return array('status' => $status, 'code' => $r['code'], 'text' => $r['text'] !== '' ? $r['text'] : $r['error']);
}

/** "+14165550123" as OpenSRS wants it, "+1.4165550123". E.164 country codes are prefix-free:
 *  1 and 7 are one digit, the two-digit set below is fixed by the ITU, and every other code has
 *  three digits. */
function cdr_opensrs_phone($e164) {
    $digits = ltrim((string) $e164, '+');
    if ($digits === '' || !ctype_digit($digits)) return (string) $e164;
    static $two = array('20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92','93','94','95','98');
    if ($digits[0] === '1' || $digits[0] === '7') $len = 1;
    elseif (in_array(substr($digits, 0, 2), $two, true)) $len = 2;
    else $len = 3;
    return '+' . substr($digits, 0, $len) . '.' . substr($digits, $len);
}

/** The order's registrant as an OpenSRS contact. One contact is owner, admin and billing; the
 *  reseller's own tech contact is used (custom_tech_contact 0). */
function cdr_opensrs_contact($r) {
    $name = trim($r['first_name'] . ' ' . $r['last_name']);
    $contact = array(
        'first_name' => $r['first_name'],
        'last_name' => $r['last_name'],
        // OpenSRS asks for an organisation on every contact; a personal registration uses the name.
        'org_name' => $r['org_name'] !== '' ? $r['org_name'] : $name,
        'email' => $r['email'],
        'phone' => cdr_opensrs_phone($r['phone']),
        'address1' => $r['address1'],
        'city' => $r['city'],
        'country' => $r['country'],
        'postal_code' => $r['postal_code'],
    );
    if ($r['address2'] !== '') $contact['address2'] = $r['address2'];
    if ($r['state'] !== '') $contact['state'] = $r['state'];
    return $contact;
}

/**
 * SW_REGISTER one domain, handle=process. The caller decides what a missing reply means; this
 * never retries, because a register that timed out may still have gone through (plan 8.2: never
 * retry sw_register after a timeout without checking first).
 */
function cdr_opensrs_register($domain, $period, $registrant, $registrantIp) {
    $c = cdr_config();
    $contact = cdr_opensrs_contact($registrant);
    $attrs = array(
        'domain' => $domain,
        'reg_type' => 'new',
        'period' => (int) $period,
        'handle' => 'process',
        // A profile per domain. 3 to 20 letters and digits; 10 to 20 characters for the password.
        'reg_username' => 'cdr' . substr(bin2hex(random_bytes(8)), 0, 14),
        'reg_password' => bin2hex(random_bytes(8)),
        'auto_renew' => 0,
        'f_lock_domain' => 1,
        'f_whois_privacy' => 0,
        'custom_tech_contact' => 0,
        'contact_set' => array('owner' => $contact, 'admin' => $contact, 'billing' => $contact),
    );
    $ns = array_values(array_filter((array) $c['opensrs_nameservers']));
    if (count($ns) >= 2) {
        $attrs['custom_nameservers'] = 1;
        $attrs['nameserver_list'] = array();
        foreach ($ns as $i => $host) $attrs['nameserver_list'][] = array('name' => $host, 'sortorder' => $i + 1);
    } else {
        // The account's default nameservers (Tucows panel, Account Settings).
        $attrs['custom_nameservers'] = 0;
    }
    // Who is registering, for the registry's records: a top-level parameter, not an attribute.
    $extra = array();
    if ($registrantIp && filter_var($registrantIp, FILTER_VALIDATE_IP)) $extra['registrant_ip'] = $registrantIp;
    $r = cdr_opensrs_call('SW_REGISTER', $attrs, 'DOMAIN', 60, $extra);
    $r['reg_username'] = $attrs['reg_username'];
    return $r;
}

/** The state of an OpenSRS order: completed, pending, declined, cancelled, waiting... or null. */
function cdr_opensrs_order_status($orderId) {
    $r = cdr_opensrs_call('GET_ORDER_INFO', array('order_id' => (string) $orderId), 'DOMAIN', 20);
    if (!$r['transport'] || $r['code'] !== 200) return null;
    $f = isset($r['attributes']['field_hash']) && is_array($r['attributes']['field_hash']) ? $r['attributes']['field_hash'] : array();
    return isset($f['status']) ? strtolower((string) $f['status']) : null;
}

/** Orders on this reseller account for a domain, newest first: array of {id, status, type, date}.
 *  Null when Tucows could not be asked. */
function cdr_opensrs_orders_for($domain) {
    $r = cdr_opensrs_call('GET_ORDERS_BY_DOMAIN', array('domain' => $domain, 'type' => 'new'), 'DOMAIN', 20);
    if (!$r['transport'] || $r['code'] !== 200) return null;
    $orders = isset($r['attributes']['orders']) && is_array($r['attributes']['orders']) ? $r['attributes']['orders'] : array();
    $out = array();
    foreach ($orders as $o) {
        if (!is_array($o) || empty($o['id'])) continue;
        $out[] = array(
            'id' => (string) $o['id'],
            'status' => isset($o['status']) ? strtolower((string) $o['status']) : '',
            'type' => isset($o['type']) ? (string) $o['type'] : '',
            'date' => isset($o['order_date']) ? (string) $o['order_date'] : '',
        );
    }
    usort($out, function ($a, $b) { return (int) $b['id'] - (int) $a['id']; });
    return $out;
}

/** The reseller balance in USD, or null. Used by the admin page's health line. */
function cdr_opensrs_balance() {
    $r = cdr_opensrs_call('GET_BALANCE', array(), 'BALANCE', 15);
    if (!$r['transport'] || $r['code'] !== 200 || !isset($r['attributes']['balance'])) return null;
    return (float) $r['attributes']['balance'];
}
