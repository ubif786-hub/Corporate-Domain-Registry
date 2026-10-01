#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 droplet for the site. Run as root, from this folder:
#
#   DEPLOY_KEY="ssh-ed25519 AAAA... github-actions" bash setup.sh
#
# DEPLOY_KEY is the PUBLIC half of the key GitHub Actions deploys with (its private half is the
# DROPLET_SSH_KEY repository secret). Safe to run again: it only adds what is missing and never
# overwrites /srv/cdr/cdr.env or the orders.
#
# The folder needs, beside this script: cdr-site.conf, http.conf, cdr-api.service,
# config.sample.env and fetch-geoip.mjs (the README's copy command puts them there).
#
# Layout (secrets and orders OUTSIDE the web root):
#   /srv/cdr/public_html/    the static site, uploaded by the deploy job (user "deploy")
#   /srv/cdr/api/server.js   the API bundle, uploaded by the deploy job; run by systemd as "cdr"
#   /srv/cdr/cdr.env         the settings and keys; root:cdr 640; filled in by hand
#   /srv/cdr/cdr-orders/     the orders, written by the API (cdr)
#   /srv/cdr/geo/            the IP database, refreshed monthly
set -euo pipefail
cd "$(dirname "$0")"
: "${DEPLOY_KEY:?set DEPLOY_KEY to the deploy public key}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get install -y ca-certificates curl gnupg nginx certbot rsync ufw unattended-upgrades

# Node 22 from NodeSource (Ubuntu's own is older).
if ! node --version 2>/dev/null | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# The API's own user: no shell, no home, owns only the orders.
id cdr >/dev/null 2>&1 || adduser --system --group --no-create-home --shell /usr/sbin/nologin cdr

# The deploy user: may write the web root and the API folder, and restart the API. Nothing else.
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
grep -qxF "$DEPLOY_KEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo "$DEPLOY_KEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart cdr-api' > /etc/sudoers.d/cdr-deploy
chmod 440 /etc/sudoers.d/cdr-deploy
visudo -cf /etc/sudoers.d/cdr-deploy

# Folders.
install -d -m 755 -o root -g root /srv/cdr
install -d -m 755 -o deploy -g deploy /srv/cdr/public_html
install -d -m 755 -o deploy -g deploy /srv/cdr/api
install -d -m 700 -o cdr -g cdr /srv/cdr/cdr-orders
install -d -m 755 -o root -g root /srv/cdr/geo
install -d -m 755 /var/www/letsencrypt
if [ ! -f /srv/cdr/cdr.env ]; then
  install -m 640 -o root -g cdr config.sample.env /srv/cdr/cdr.env
  echo ">> Fill in /srv/cdr/cdr.env (nano /srv/cdr/cdr.env). The API re-reads it on change."
fi
[ -f /srv/cdr/public_html/index.html ] || echo '<!doctype html><title>Coming soon</title><p>Coming soon.</p>' > /srv/cdr/public_html/index.html

# The IP database, now and on the 3rd of every month.
install -m 644 fetch-geoip.mjs /srv/cdr/geo/fetch-geoip.mjs
[ -f /srv/cdr/geo/dbip-city-lite.mmdb ] || node /srv/cdr/geo/fetch-geoip.mjs /srv/cdr/geo/dbip-city-lite.mmdb
echo '0 4 3 * * root node /srv/cdr/geo/fetch-geoip.mjs /srv/cdr/geo/dbip-city-lite.mmdb >/dev/null 2>&1' > /etc/cron.d/cdr-geoip
chmod 644 /etc/cron.d/cdr-geoip

# PostgreSQL for the orders, swap, and the database backups every 6 hours.
bash ./postgres.sh

# The API service. It starts once the deploy job has uploaded server.js; the 5-minute sweep runs
# inside it, so there is no cron job for orders.
install -m 644 cdr-api.service /etc/systemd/system/cdr-api.service
systemctl daemon-reload
systemctl enable cdr-api
[ -f /srv/cdr/api/server.js ] && systemctl restart cdr-api || echo ">> cdr-api starts after the first deploy uploads /srv/cdr/api/server.js"

# nginx: the site rules, served on plain HTTP until the domain points here.
install -m 644 cdr-site.conf /etc/nginx/snippets/cdr-site.conf
install -m 644 http.conf /etc/nginx/sites-available/cdr
ln -sf /etc/nginx/sites-available/cdr /etc/nginx/sites-enabled/cdr
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Firewall: SSH and the web only. The API listens on 127.0.0.1 and is not reachable from outside.
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo
echo "Done. This server's public IP (for the Tucows IP Access Rules):"
curl -s https://api.ipify.org; echo
