# Hosting on a DigitalOcean droplet

Use this only if the site moves off GoDaddy's shared hosting. That hosting can't reach Tucows: it
blocks outgoing connections to port 55443 (tested 28 and 29 Sep 2026). The code doesn't change. The
same static export and the same PHP run behind nginx instead of Apache.

What you get: Ubuntu 24.04, nginx, PHP 8.3 (FPM), a Let's Encrypt certificate, the cron job, a
firewall, and a `deploy` user that GitHub Actions uploads with. Secrets and orders live above the
web root, as on cPanel:

```
/srv/cdr/public_html/    the site (uploaded by the deploy job)
/srv/cdr/cdr-config.php  the keys (filled in by hand, never uploaded)
/srv/cdr/cdr-orders/     the orders
```

## 1. Create the droplet (the client's DigitalOcean account)

- Ubuntu 24.04 LTS, region Toronto (TOR1), Basic, Regular, 1 GB / 1 CPU is enough.
- Add your SSH key for root.
- Note the IPv4 address. It stays the same for the droplet's life. It's the IP that goes on the
  Tucows **IP Access Rules**.

## 2. Make a deploy key (on your machine)

```
ssh-keygen -t ed25519 -f cdr-deploy -N "" -C github-actions
```

`cdr-deploy.pub` goes on the server (next step). `cdr-deploy` (private) becomes the
`DROPLET_SSH_KEY` repository secret. Delete both local copies afterwards.

## 3. Set up the server

```
ssh root@<IP> mkdir -p /root/cdr-setup
scp deploy/droplet/* cpanel/cdr-config.sample.php root@<IP>:/root/cdr-setup/
ssh root@<IP> 'DEPLOY_KEY="$(cat)" bash /root/cdr-setup/setup.sh' < cdr-deploy.pub
```

Then fill in the keys:

```
ssh root@<IP> nano /srv/cdr/cdr-config.php
```

Set `mail_transport` to `'resend'` and add `resend_api_key`. DigitalOcean blocks outgoing mail
ports, so PHP's `mail()` can't send. Resend (resend.com) sends over HTTPS. Verify the sending
domain there first (it gives DNS records to add at GoDaddy).

## 4. Point GitHub Actions at it

Repository settings, Secrets and variables, Actions:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DROPLET_HOST` | the IP |
| Secret | `DROPLET_SSH_KEY` | the private key from step 2 |
| Secret | `DROPLET_KNOWN_HOSTS` | the output of `ssh-keyscan -t ed25519 <IP>` |
| Variable | `CDR_HOST` | `droplet` |
| Variable | `CDR_PAYMENTS` | `1` when the shop should be on |

Run the workflow by hand (Actions, "Deploy to live site", Run workflow). Check the site at
`http://<IP>/`.

## 5. Move the domain (go-live)

1. At GoDaddy DNS: the `@` A record to the droplet IP, and `www` as a CNAME to `@`. Leave MX and
   TXT (email) records alone.
2. Once `dig +short www.corporatedomainregistry.com` shows the droplet IP:

   ```
   ssh root@<IP> 'CERT_EMAIL=info@corporatedomainregistry.com bash /root/cdr-setup/enable-https.sh'
   ```

3. Stripe webhook: `https://www.corporatedomainregistry.com/api/stripe-webhook/`.

## Checks

```
curl -s  https://www.corporatedomainregistry.com/api/geo/
curl -s  "https://www.corporatedomainregistry.com/api/domain-check/?domain=example.com"
curl -sI https://www.corporatedomainregistry.com/api/checkout/        # 405
curl -sI https://www.corporatedomainregistry.com/api/lib/cdr.php      # 404
curl -sI https://www.corporatedomainregistry.com/lookup               # 308 to /whois/
ssh root@<IP> sudo -u www-data php /srv/cdr/public_html/api/cron.php  # {"ran_at": ...}
```

The nginx rules in `cdr-site.conf` mirror the `.htaccess` that `scripts/export-cpanel.mjs` writes
for cPanel. If a redirect or an API route changes there, change it here too.
