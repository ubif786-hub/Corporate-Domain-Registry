# Hosting on the DigitalOcean droplet

The site runs on a DigitalOcean droplet because GoDaddy's shared hosting can't reach Tucows: it
blocks outgoing connections to port 55443 (tested 28 and 29 Sep 2026, confirmed by Tucows 30 Sep).

What runs there: Ubuntu 24.04, nginx serving the static export (`apps/web`), the API (`apps/api`,
Node 22, systemd unit `cdr-api`) behind `/api/`, PostgreSQL 16 holding the orders, a Let's Encrypt
certificate, a firewall, and a `deploy` user that GitHub Actions uploads with. Secrets and orders
live outside the web root:

```
/srv/cdr/public_html/    the static site (uploaded by the deploy job)
/srv/cdr/api/server.js   the API bundle (uploaded by the deploy job, run as user "cdr")
/srv/cdr/api/migrations/ the database migrations, applied by the API when it starts
/srv/cdr/cdr.env         the settings and keys (filled in by hand, never uploaded)
/srv/cdr/cdr-orders/     the outbox of the "file" mail transport (orders are in the database)
/srv/cdr/geo/            the IP database, refreshed monthly
/var/backups/cdr-db/     database dumps, every 6 hours, 7 days kept
```

The droplet: `cdr-web`, Toronto (TOR1), IP `142.93.145.38`, on the client's DigitalOcean account.

## 1. Create the droplet

Done 1 Oct 2026. For a new one: Ubuntu 24.04 LTS, Toronto, Basic, Regular, 1 GB / 1 CPU, your SSH
key for root. The IPv4 address stays the same for the droplet's life; it goes on the Tucows
**IP Access Rules**.

## 2. Make a deploy key (on your machine)

```
ssh-keygen -t ed25519 -f cdr-deploy -N "" -C github-actions
```

`cdr-deploy.pub` goes on the server (next step). `cdr-deploy` (private) becomes the
`DROPLET_SSH_KEY` repository secret. Delete both local copies afterwards.

## 3. Set up the server

From the repository root (`ssh cdr` is the alias for root on the droplet):

```
ssh cdr mkdir -p /root/cdr-setup
scp deploy/droplet/* apps/api/config.sample.env apps/api/scripts/fetch-geoip.mjs cdr:/root/cdr-setup/
ssh cdr 'DEPLOY_KEY="$(cat)" bash /root/cdr-setup/setup.sh' < cdr-deploy.pub
```

Then fill in the settings (the API re-reads the file when it changes):

```
ssh -t cdr nano /srv/cdr/cdr.env
```

Set `MAIL_TRANSPORT=resend` and `RESEND_API_KEY`. DigitalOcean blocks outgoing mail ports, so email
goes over Resend's HTTPS API. Verify the sending domain in Resend first (it gives DNS records to add
at GoDaddy).

## 4. Point GitHub Actions at it

Repository settings, Secrets and variables, Actions:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DROPLET_HOST` | the IP |
| Secret | `DROPLET_SSH_KEY` | the private key from step 2 |
| Secret | `DROPLET_KNOWN_HOSTS` | the output of `ssh-keyscan -t ed25519 <IP>` |
| Variable | `CDR_PAYMENTS` | `1` when the shop should be on |

Run the workflow by hand (Actions, "Deploy", Run workflow). It uploads the pages and the API and
restarts `cdr-api`. Check the site at `http://<IP>/`.

### Deploying by hand instead

From the repository root, after `npm install` (needs only ssh and tar, so it works from Git Bash):

```
bash deploy/droplet/push.sh              # shop off
bash deploy/droplet/push.sh --payments   # shop on
```

## 5. Move the domain (go-live)

1. At GoDaddy DNS: the `@` A record to the droplet IP, and `www` as a CNAME to `@`. Leave MX and
   TXT (email) records alone.
2. Once `dig +short www.corporatedomainregistry.com` shows the droplet IP:

   ```
   ssh cdr 'CERT_EMAIL=info@corporatedomainregistry.com bash /root/cdr-setup/enable-https.sh'
   ```

3. Stripe webhook: `https://www.corporatedomainregistry.com/api/stripe-webhook/`.

## 6. Database and backups

PostgreSQL 16 from Ubuntu, set up by `postgres.sh` (setup.sh runs it; it is safe to run again).
It listens on this machine only. The database `cdr` belongs to the role `cdr`, and the API's
system user `cdr` logs in over the Unix socket without a password (peer authentication):

```
DATABASE_URL=postgresql://cdr@/cdr?host=/var/run/postgresql
```

Tables: `orders`, `order_lines` (one row per domain), `order_log` (each order's history). The
schema is in `apps/api/src/features/orders/order.schema.ts`; migrations in `apps/api/drizzle/`.

**Backups, two layers:**

1. `cdr-db-backup.timer` dumps the database every 6 hours (00:15, 06:15, 12:15, 18:15 UTC) into
   `/var/backups/cdr-db/` and keeps the newest 28 (7 days). The dumps hold customer details: the
   folder is readable by `postgres` only.
2. DigitalOcean droplet backups (enable in the panel: the droplet, Backups, Enable, Daily). They
   copy the whole disk, dumps included, and are stored away from the droplet. Daily costs 30% of
   the droplet price and keeps 7 days.

```
ssh cdr systemctl list-timers cdr-db-backup.timer      # when the next dump runs
ssh cdr ls -lh /var/backups/cdr-db/                    # the dumps
ssh cdr /usr/local/sbin/cdr-db-backup                  # one dump now (before a risky change)
ssh cdr journalctl -u cdr-db-backup -n 20              # the last runs
```

**Restore a dump** (replaces the current orders with the dump's):

```
ssh cdr systemctl stop cdr-api
ssh cdr 'runuser -u postgres -- pg_restore --clean --if-exists -d cdr /var/backups/cdr-db/cdr-<stamp>.dump'
ssh cdr systemctl start cdr-api
```

**Look at the data** (read-only habits: the admin page and its CSV cover daily needs):

```
ssh -t cdr 'runuser -u cdr -- psql -h /var/run/postgresql -d cdr'
```

## 7. Admin panel

The panel is at https://www.corporatedomainregistry.com/admin/. Everyone has their own sign-in.
Add the first owner on the server; the command prints a setup link (72 hours, works once), and the
person opens it and chooses their own password:

```
ssh cdr 'runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js add-user --email you@example.com --name "Your Name" --role owner'
ssh cdr 'runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js list'
ssh cdr 'runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js link --email you@example.com'   # forgotten password
```

Or set a temporary password directly (a weak one is allowed here; change it under Your account
before payments go live):

```
ssh cdr 'runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js add-user --email you@example.com --name "Your Name" --role owner --password TEMPORARY'
ssh cdr 'runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js set-password --email you@example.com --password TEMPORARY'
```

After that, owners add everyone else on the Team page. The `/admin/` pages get no-index and
no-framing headers from `cdr-site.conf`; after changing that file, copy it up and reload nginx:

```
scp deploy/droplet/cdr-site.conf cdr:/tmp/ && ssh cdr 'install -m 644 /tmp/cdr-site.conf /etc/nginx/snippets/cdr-site.conf && nginx -t && systemctl reload nginx'
```

## Checks

```
curl -s  https://www.corporatedomainregistry.com/api/geo/
curl -s  "https://www.corporatedomainregistry.com/api/domain-check/?domain=example.com"
curl -sI https://www.corporatedomainregistry.com/api/checkout/        # 405
curl -sI https://www.corporatedomainregistry.com/api/anything-else/   # 404
curl -sI https://www.corporatedomainregistry.com/lookup               # 308 to /whois/
curl -s  "https://www.corporatedomainregistry.com/api/cron/?token=<CRON_TOKEN>"   # {"ran_at": ...}
ssh cdr systemctl status cdr-api
ssh cdr journalctl -u cdr-api -n 50      # "[db] ready" after each start
ssh cdr systemctl status postgresql
```

The redirects in `cdr-site.conf` repeat `apps/web/redirects.json`. If a redirect changes there,
change it here too.
