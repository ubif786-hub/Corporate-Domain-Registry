#!/usr/bin/env bash
# Uploads the server settings, edited on this machine, to the droplet as /srv/cdr/cdr.env.
# Run from the repository root:
#
#   bash deploy/droplet/push-env.sh                 # uploads apps/api/cdr.server.env
#   bash deploy/droplet/push-env.sh <other file>
#
# The file is checked first, so a local-only value never reaches the server. It is written with
# the owner and mode the API needs (root:cdr, 640), and the API picks it up without a restart.
# Nothing is printed except setting NAMES.
set -euo pipefail
HOST="${HOST:-cdr}"
cd "$(dirname "$0")/../.."
FILE="${1:-apps/api/cdr.server.env}"
[ -f "$FILE" ] || { echo "not found: $FILE"; exit 1; }

value() { sed -n "s/^$1=//p" "$FILE" | tr -d '\r' | head -1; }
problems=()
for k in ORDERS_DIR GEOIP_DB; do
  v="$(value "$k")"
  [ -z "$v" ] || [[ "$v" == /srv/cdr/* ]] || problems+=("$k must be under /srv/cdr/ (or empty for the default)")
done
case "$(value SITE_URL)" in
  *localhost*|*127.0.0.1*|"") problems+=("SITE_URL must be the server's address, not a local one") ;;
esac
[ -z "$(value OPENSRS_URL)" ] || problems+=("OPENSRS_URL must be empty on the server (it points at the test stand-in)")
case "$(value DATABASE_URL)" in
  "") problems+=("DATABASE_URL must be set: postgresql://cdr@/cdr?host=/var/run/postgresql") ;;
  *127.0.0.1*|*localhost*|*cdr_test*) problems+=("DATABASE_URL points at a local test database") ;;
esac
case "$(value STRIPE_API)" in ""|https://api.stripe.com/v1) ;; *) problems+=("STRIPE_API must be https://api.stripe.com/v1 or empty") ;; esac
stripe_live=no; [[ "$(value STRIPE_SECRET_KEY)" == sk_live_* ]] && stripe_live=yes
tucows_live=no; [ "$(value OPENSRS_ENV)" = "live" ] && tucows_live=yes
if [ ${#problems[@]} -gt 0 ]; then
  printf 'Not uploaded:\n'; printf '  - %s\n' "${problems[@]}"; exit 1
fi

[ "$stripe_live" = "$tucows_live" ] || echo "Note: Stripe live=$stripe_live, Tucows live=$tucows_live. Search works; checkout stays shut until both match."
missing="$(grep -oE '^[A-Z_]+=.*PASTE' "$FILE" | cut -d= -f1 | tr '\n' ' ' || true)"
[ -z "$missing" ] || echo "Still placeholders (these features stay off): $missing"

tr -d '\r' < "$FILE" | ssh "$HOST" '
  set -e
  cat > /srv/cdr/cdr.env.new
  install -m 640 -o root -g cdr /srv/cdr/cdr.env.new /srv/cdr/cdr.env
  rm -f /srv/cdr/cdr.env.new'
echo "Uploaded to $HOST:/srv/cdr/cdr.env (Stripe live: $stripe_live, Tucows live: $tucows_live)."
