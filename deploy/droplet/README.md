# Hosting on the DigitalOcean droplet

The site runs on a DigitalOcean droplet because GoDaddy's shared hosting can't reach Tucows: it
blocks outgoing connections to port 55443 (tested 28 and 29 Sep 2026, confirmed by Tucows 30 Sep).

What runs there: Ubuntu 24.04, nginx serving the static export (`apps/web`), the API (`apps/api`,
Node 22, systemd unit `cdr-api`) behind `/api/`, a Let's Encrypt certificate, a firewall, and a
`deploy` user that GitHub Actions uploads with. Secrets and orders live outside the web root:

```
/srv/cdr/public_html/    the static site (uploaded by the deploy job)
/srv/cdr/api/server.js   the API bundle (uploaded by the deploy job, run as user "cdr")
/srv/cdr/cdr.env         the settings and keys (filled in by hand, never uploaded)
/srv/cdr/cdr-orders/     the orders
/srv/cdr/geo/            the IP database, refreshed monthly
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

From the repository root, after `npm ci`:

```
npm run export -w @cdr/web              # apps/web/out, shop on
npm run build -w @cdr/api               # apps/api/dist/server.js
rsync -az --delete apps/web/out/ cdr:/srv/cdr/public_html/
rsync -az apps/api/dist/ cdr:/srv/cdr/api/
ssh cdr 'chown -R deploy:deploy /srv/cdr/public_html /srv/cdr/api && systemctl restart cdr-api'
```

## 5. Move the domain (go-live)

1. At GoDaddy DNS: the `@` A record to the droplet IP, and `www` as a CNAME to `@`. Leave MX and
   TXT (email) records alone.
2. Once `dig +short www.corporatedomainregistry.com` shows the droplet IP:

   ```
   ssh cdr 'CERT_EMAIL=info@corporatedomainregistry.com bash /root/cdr-setup/enable-https.sh'
   ```

3. Stripe webhook: `https://www.corporatedomainregistry.com/api/stripe-webhook/`.

## Checks

```
curl -s  https://www.corporatedomainregistry.com/api/geo/
curl -s  "https://www.corporatedomainregistry.com/api/domain-check/?domain=example.com"
curl -sI https://www.corporatedomainregistry.com/api/checkout/        # 405
curl -sI https://www.corporatedomainregistry.com/api/anything-else/   # 404
curl -sI https://www.corporatedomainregistry.com/lookup               # 308 to /whois/
curl -s  "https://www.corporatedomainregistry.com/api/cron/?token=<CRON_TOKEN>"   # {"ran_at": ...}
ssh cdr systemctl status cdr-api
ssh cdr journalctl -u cdr-api -n 50
```

The redirects in `cdr-site.conf` repeat `apps/web/redirects.json`. If a redirect changes there,
change it here too.
