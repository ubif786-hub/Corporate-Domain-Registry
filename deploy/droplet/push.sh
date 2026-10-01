#!/usr/bin/env bash
# Builds the site and the API on this machine and puts both on the droplet. Needs only ssh and tar
# (works from Git Bash on Windows, no rsync). Run from the repository root:
#
#   bash deploy/droplet/push.sh              # shop OFF: the pages keep their placeholders
#   bash deploy/droplet/push.sh --payments   # shop ON: search, cart and checkout call the API
#
# HOST is an ssh destination with root access (default: the "cdr" alias in ~/.ssh/config).
# The settings file (/srv/cdr/cdr.env) and the database are never touched; new database migrations
# (shipped in dist/migrations) are applied by the API when it starts.
set -euo pipefail
HOST="${HOST:-cdr}"
FLAG="${1:-}"
cd "$(dirname "$0")/../.."

echo ">> building the site ${FLAG:-(shop off)}"
node apps/web/scripts/export-static.mjs --site https://www.corporatedomainregistry.com $FLAG | tail -2
test -f apps/web/out/index.html

echo ">> building the API"
npm run build -w @cdr/api >/dev/null
test -f apps/api/dist/server.js

echo ">> uploading the site to $HOST"
# Unpacked beside the live folder, then swapped in, so visitors never see half a site.
tar -C apps/web/out -cf - . | ssh "$HOST" '
  set -e
  rm -rf /srv/cdr/public_html.new && mkdir -p /srv/cdr/public_html.new
  tar -C /srv/cdr/public_html.new -xf -
  chown -R deploy:deploy /srv/cdr/public_html.new
  rm -rf /srv/cdr/public_html.old
  mv /srv/cdr/public_html /srv/cdr/public_html.old
  mv /srv/cdr/public_html.new /srv/cdr/public_html'

echo ">> uploading the API and restarting it"
tar -C apps/api/dist -cf - . | ssh "$HOST" '
  set -e
  tar -C /srv/cdr/api -xf -
  chown -R deploy:deploy /srv/cdr/api
  systemctl restart cdr-api
  sleep 2
  systemctl is-active cdr-api
  curl -fsS http://127.0.0.1:4000/api/geo/ >/dev/null && echo "API answers"
  for i in $(seq 1 10); do
    journalctl -u cdr-api --since "-30s" --no-pager | grep -q "\[db\] ready" && { echo "database ready"; exit 0; }
    sleep 1
  done
  echo "WARNING: the database is not ready; see: journalctl -u cdr-api -n 30"'

echo ">> done. The previous site is kept in /srv/cdr/public_html.old on the server."
