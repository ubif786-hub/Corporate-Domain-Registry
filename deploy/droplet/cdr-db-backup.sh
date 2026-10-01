#!/usr/bin/env bash
# Dumps the orders database into /var/backups/cdr-db/ and keeps the newest 28 dumps (7 days at one
# every 6 hours). Installed as /usr/local/sbin/cdr-db-backup and run by cdr-db-backup.timer; run it
# by hand as root any time (before a risky change, for example).
#
# The dumps hold customers' names, addresses and emails: the folder is readable by postgres only.
# Restore one (deploy/droplet/README.md, "Database"):
#   systemctl stop cdr-api
#   runuser -u postgres -- pg_restore --clean --if-exists -d cdr /var/backups/cdr-db/cdr-<stamp>.dump
#   systemctl start cdr-api
set -euo pipefail
DIR=/var/backups/cdr-db
KEEP="${KEEP:-28}"
install -d -m 700 -o postgres -g postgres "$DIR"

stamp="$(date -u +%Y%m%d-%H%M)"
part="$DIR/.cdr-$stamp.dump.part"
runuser -u postgres -- pg_dump --format=custom --compress=6 --dbname=cdr --file="$part"
mv "$part" "$DIR/cdr-$stamp.dump"

# Oldest first out.
ls -1t "$DIR"/cdr-*.dump | tail -n +"$((KEEP + 1))" | xargs -r rm -f
echo "backup: $DIR/cdr-$stamp.dump ($(du -h "$DIR/cdr-$stamp.dump" | cut -f1)), $(ls -1 "$DIR"/cdr-*.dump | wc -l) kept"
