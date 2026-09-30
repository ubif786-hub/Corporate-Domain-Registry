#!/usr/bin/env bash
# Run as root once the domain's DNS points at this server (both @ and www):
#
#   CERT_EMAIL=info@corporatedomainregistry.com bash enable-https.sh
#
# Gets a Let's Encrypt certificate for the bare and the www name, then switches nginx to HTTPS
# with the bare domain and plain HTTP redirecting to https://www. Renewal is automatic (certbot's
# own timer); nginx is reloaded after each renewal.
set -euo pipefail
cd "$(dirname "$0")"
: "${CERT_EMAIL:?set CERT_EMAIL}"
WWW="${WWW:-www.corporatedomainregistry.com}"
BARE="${WWW#www.}"

certbot certonly --webroot -w /var/www/letsencrypt --cert-name "$WWW" -d "$WWW" -d "$BARE" \
  --email "$CERT_EMAIL" --agree-tos --no-eff-email --non-interactive
echo 'systemctl reload nginx' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

sed -e "s/__WWW__/$WWW/g" -e "s/__BARE__/$BARE/g" https.conf > /etc/nginx/sites-available/cdr
nginx -t
systemctl reload nginx
echo "HTTPS on: https://$WWW"
