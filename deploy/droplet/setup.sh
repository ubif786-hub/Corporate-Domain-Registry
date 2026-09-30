#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 droplet for the site. Run as root, from this folder:
#
#   DEPLOY_KEY="ssh-ed25519 AAAA... github-actions" bash setup.sh
#
# DEPLOY_KEY is the PUBLIC half of the key GitHub Actions deploys with (its private half is the
# DROPLET_SSH_KEY repository secret). Safe to run again: it only adds what is missing and never
# overwrites /srv/cdr/cdr-config.php or the orders.
#
# Layout (the same shape as cPanel: secrets and orders ABOVE the web root):
#   /srv/cdr/public_html/   the site, uploaded by the deploy job (user "deploy")
#   /srv/cdr/cdr-config.php the keys; root:www-data 640; filled in by hand
#   /srv/cdr/cdr-orders/    the orders, written by PHP (www-data)
set -euo pipefail
cd "$(dirname "$0")"
: "${DEPLOY_KEY:?set DEPLOY_KEY to the deploy public key}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get install -y nginx php8.3-fpm php8.3-curl php8.3-xml php8.3-mbstring certbot rsync ufw unattended-upgrades

# The deploy user: may write the web root, nothing else.
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
grep -qxF "$DEPLOY_KEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo "$DEPLOY_KEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# Folders.
install -d -m 755 -o root -g root /srv/cdr
install -d -m 755 -o deploy -g deploy /srv/cdr/public_html
install -d -m 700 -o www-data -g www-data /srv/cdr/cdr-orders
install -d -m 755 /var/www/letsencrypt
if [ ! -f /srv/cdr/cdr-config.php ]; then
  install -m 640 -o root -g www-data cdr-config.sample.php /srv/cdr/cdr-config.php
  echo ">> Fill in /srv/cdr/cdr-config.php (nano /srv/cdr/cdr-config.php). Set mail_transport to 'resend'."
fi
[ -f /srv/cdr/public_html/index.html ] || echo '<!doctype html><title>Coming soon</title><p>Coming soon.</p>' > /srv/cdr/public_html/index.html

# PHP: the webhook keeps registering after it answers Stripe, for up to five minutes.
cat > /etc/php/8.3/fpm/conf.d/90-cdr.ini <<'INI'
expose_php = Off
max_execution_time = 300
memory_limit = 128M
INI
systemctl restart php8.3-fpm

# nginx: the site rules, served on plain HTTP until the domain points here.
install -m 644 cdr-site.conf /etc/nginx/snippets/cdr-site.conf
install -m 644 http.conf /etc/nginx/sites-available/cdr
ln -sf /etc/nginx/sites-available/cdr /etc/nginx/sites-enabled/cdr
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# The background job, every 5 minutes, as the web server's user.
echo '*/5 * * * * www-data php /srv/cdr/public_html/api/cron.php >/dev/null 2>&1' > /etc/cron.d/cdr
chmod 644 /etc/cron.d/cdr

# Firewall: SSH and the web only.
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo
echo "Done. This server's public IP (for the Tucows IP Access Rules):"
curl -s https://api.ipify.org; echo
