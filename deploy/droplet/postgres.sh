#!/usr/bin/env bash
# PostgreSQL on this droplet for the orders, plus swap and the database backups. Run as root from
# the folder holding the deploy/droplet files (setup.sh runs it; safe to run again):
#
#   bash /root/cdr-setup/postgres.sh
#
# What it sets up:
#   - 2 GB of swap, so a memory spike cannot kill the API or the database on a 1 GB server
#   - PostgreSQL from Ubuntu, listening on this machine only, tuned for 1 GB shared with the API
#   - the database "cdr" owned by the role "cdr". The API's system user "cdr" logs in over the
#     Unix socket with peer authentication, so there is no database password anywhere. Its
#     DATABASE_URL is postgresql://cdr@/cdr?host=/var/run/postgresql
#   - a dump of the database every 6 hours into /var/backups/cdr-db/, the last 28 kept (7 days)
set -euo pipefail
cd "$(dirname "$0")"
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }

echo ">> swap"
if ! swapon --show --noheadings | grep -q '^/swapfile'; then
  [ -f /swapfile ] || fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness = 10' > /etc/sysctl.d/90-cdr-swap.conf
sysctl -q -p /etc/sysctl.d/90-cdr-swap.conf

echo ">> PostgreSQL"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q >/dev/null
apt-get install -y -q postgresql >/dev/null
PGV="$(ls /etc/postgresql | sort -V | tail -1)"

cat > "/etc/postgresql/$PGV/main/conf.d/cdr.conf" <<'EOF'
# Corporate Domain Registry: one small database on a 1 GB server shared with the API.
listen_addresses = 'localhost'
max_connections = 20
shared_buffers = 128MB
effective_cache_size = 384MB
work_mem = 4MB
maintenance_work_mem = 64MB
random_page_cost = 1.1
timezone = 'UTC'
log_timezone = 'UTC'
# Anything slower than a second is worth a line in the log.
log_min_duration_statement = 1000
EOF
systemctl enable postgresql >/dev/null 2>&1
systemctl restart postgresql

echo ">> role and database"
runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cdr') THEN CREATE ROLE cdr LOGIN; END IF; END \$\$;"
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'cdr'" | grep -q 1; then
  runuser -u postgres -- createdb -O cdr -E UTF8 -T template0 cdr
fi
# Only its owner (and the postgres superuser) may connect.
runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 -c "REVOKE ALL ON DATABASE cdr FROM PUBLIC;"

echo ">> backups"
install -m 755 cdr-db-backup.sh /usr/local/sbin/cdr-db-backup
install -m 644 cdr-db-backup.service /etc/systemd/system/cdr-db-backup.service
install -m 644 cdr-db-backup.timer /etc/systemd/system/cdr-db-backup.timer
install -d -m 700 -o postgres -g postgres /var/backups/cdr-db

# The API waits for the database at boot.
install -m 644 cdr-api.service /etc/systemd/system/cdr-api.service
systemctl daemon-reload
systemctl enable --now cdr-db-backup.timer >/dev/null 2>&1

echo ">> check"
runuser -u cdr -- psql -h /var/run/postgresql -d cdr -tAc "SELECT 'cdr can log in to ' || current_database() || ' on PostgreSQL ' || current_setting('server_version')"
/usr/local/sbin/cdr-db-backup
systemctl list-timers cdr-db-backup.timer --no-pager | sed -n '1,2p'
free -m | sed -n '1,3p'
echo
echo "Done. In the settings file: DATABASE_URL=postgresql://cdr@/cdr?host=/var/run/postgresql"
