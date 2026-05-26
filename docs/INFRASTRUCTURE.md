# MIGIP Infrastructure

Production deployment: **https://migipdocs.ru**

## Architecture

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ HTTPS (Let's Encrypt)
       ▼
┌─────────────────────────────────────┐
│ migip server (83.220.174.28)        │
│ Ubuntu 26.04, 1 vCPU / 2 GB RAM     │
│                                     │
│  Nginx :443 ──► Docker container    │
│                 migip:latest         │
│                 (Next.js :3000)      │
│                       │              │
│                       ▼              │
│  PostgreSQL 18 + pgvector :5432     │
│  (native, host)                      │
└─────────────────────────────────────┘
       │ HTTPS to n8n via proxy
       ▼
┌─────────────────────────────────────┐
│ Cloudflare Worker (migip-n8n-proxy) │
│ migip-n8n-proxy.wingform.workers.dev│
│ IP-allowlist: 83.220.174.28 only    │
└──────┬──────────────────────────────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│ n8n server (104.248.204.146, DO)    │
│ Caddy :443 ──► n8n:5678 (Docker)    │
└─────────────────────────────────────┘
```

**Why the CF Worker?** The Russian ISP serving the migip server blocks all
HTTPS traffic to DigitalOcean (AS14061) — TLS handshakes drop on the path.
Routing through Cloudflare edge bypasses the block. Other clients (browsers
outside RU) continue to talk to `n8n.wingform.cloud` directly.

## Components & credentials

| What | Where | Credentials |
|---|---|---|
| migip server SSH | `root@83.220.174.28` | password — password manager |
| PostgreSQL | `migip` DB on localhost:5432 | user `migip`, password in `/opt/migip/.env.production` |
| n8n server SSH | `root@104.248.204.146` | DigitalOcean console / password manager |
| Cloudflare account | `s.filippov@wingform.com` | dashboard.cloudflare.com |
| CF API token | env or vault | scope: Workers Scripts:Edit, Account:Read |
| Let's Encrypt | `/etc/letsencrypt/live/migipdocs.ru/` | auto-renewed via `certbot.timer` |
| n8n webhooks | n8n.wingform.cloud workflows | n8n editor UI |

App secrets (`NEXTAUTH_SECRET`, `DATABASE_URL`, n8n webhook URLs) live in
`/opt/migip/.env.production` on the migip server. **chmod 600**, root-owned.
Never commit to git.

## Common operations

### Deploying a code change

From your laptop:

```bash
# Sync code to server (excludes node_modules, .next, .git, .env*)
rsync -az --exclude=node_modules --exclude='.next' --exclude='.git' \
  --exclude='.env' --exclude='.env.production' \
  --delete-after \
  ./ root@83.220.174.28:/opt/migip/

# Rebuild and restart on the server
ssh root@83.220.174.28 '
  cd /opt/migip &&
  docker build -t migip:latest . &&
  docker rm -f migip &&
  docker run -d \
    --name migip \
    --restart unless-stopped \
    --env-file /opt/migip/.env.production \
    -p 127.0.0.1:3000:3000 \
    --add-host=host.docker.internal:host-gateway \
    migip:latest'
```

Build takes ~3-5 min on the 1-vCPU server. Container picks up new code
immediately; no Nginx reload required.

### Logs

```bash
ssh root@83.220.174.28
docker logs migip --tail=100 -f                 # app logs
journalctl -u nginx -n 100                      # nginx logs
journalctl -u postgresql -n 100                 # PG logs
tail -f /var/log/nginx/access.log               # access log
tail -f /var/log/nginx/error.log                # nginx errors
```

### DB backups

Daily at 03:15, cron job `/etc/cron.d/migip-backup` writes
`/var/backups/migip/migip-YYYY-MM-DD.pgcustom`. Retention 14 days.

Manual backup:

```bash
ssh root@83.220.174.28 'sudo -u postgres pg_dump -Fc migip > /tmp/migip.pgcustom'
scp root@83.220.174.28:/tmp/migip.pgcustom ./
```

Restore (be careful — destructive):

```bash
ssh root@83.220.174.28 'pg_restore --clean --if-exists -d migip -U migip -h localhost /path/to/dump.pgcustom'
```

### Networking quirks to remember

- **Docker bridge → PostgreSQL.** UFW must allow `from 172.17.0.0/16 to any port 5432 proto tcp`.
  Without this, the Next.js container can't reach the host's PG (Connect Timeout in Prisma).
- **CF Worker IP-allowlist.** If you change the migip server's outbound IP,
  update `ALLOWED_IPS` in the Worker (see "Cloudflare Worker" below).
- **DigitalOcean reachability.** Direct HTTPS from migip to any DO IP is blocked
  by the ISP. All n8n traffic must go through the CF Worker. If you spin up new
  services on DO, plan for the same proxy pattern.

### Cloudflare Worker (n8n proxy)

- Name: `migip-n8n-proxy`
- URL: `https://migip-n8n-proxy.wingform.workers.dev`
- Source: see "Worker source" below
- Used by: `N8N_AI_*` env vars in `/opt/migip/.env.production`

Update the worker via dashboard (Workers & Pages → migip-n8n-proxy → Edit
code) or via API:

```bash
# Replace TOKEN and put updated code in /tmp/worker.js
curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/8927193132703bfb114856222de3e9e4/workers/scripts/migip-n8n-proxy" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2025-12-01"};type=application/json' \
  -F "worker.js=@/tmp/worker.js;type=application/javascript+module;filename=worker.js"
```

**Worker source** (also kept here for reference; the authoritative version is
deployed in CF):

```js
const ALLOWED_IPS = new Set(['83.220.174.28']);
const ORIGIN = 'https://n8n.wingform.cloud';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/_health') {
      return new Response('ok', { headers: { 'content-type': 'text/plain' } });
    }
    const clientIP = request.headers.get('cf-connecting-ip');
    if (!ALLOWED_IPS.has(clientIP)) {
      return new Response('Forbidden', { status: 403 });
    }
    const target = ORIGIN + url.pathname + url.search;
    const headers = new Headers(request.headers);
    headers.set('host', 'n8n.wingform.cloud');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('x-forwarded-proto');
    headers.delete('x-forwarded-for');
    headers.delete('x-real-ip');
    const init = { method: request.method, headers, redirect: 'manual' };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }
    return fetch(target, init);
  },
};
```

### Adding a new n8n webhook to MIGIP

1. Build the workflow in n8n editor on `n8n.wingform.cloud`. Note the webhook URL.
2. Replace `https://n8n.wingform.cloud` with `https://migip-n8n-proxy.wingform.workers.dev` in the URL.
3. Add as env var in `/opt/migip/.env.production` (e.g. `N8N_AI_FOO_URL=...`).
4. Reference `process.env.N8N_AI_FOO_URL` in the code.
5. `docker restart migip`.

## Uptime monitoring

Cloudflare cron Worker `migip-uptime` pings `https://migipdocs.ru/login`
every 5 minutes. On non-2xx it writes to Worker logs (visible in CF dashboard
→ Workers → migip-uptime → Logs).

To get notifications, set a `TG_BOT_TOKEN` and `TG_CHAT_ID` as Worker
secrets (Workers → migip-uptime → Settings → Variables) and the worker
will post to Telegram on failure.

Ad-hoc check: `curl https://migip-uptime.wingform.workers.dev/check`

The CF Worker `migip-n8n-proxy` is intentionally not in the uptime targets:
CF Workers can't fetch each other through `*.workers.dev` URLs reliably (the
runtime treats it as recursion). If the proxy breaks, you'll see it in
migip container logs (`AI improve fetch failed: ...`).

## Recovery / rebuild from scratch

If the migip server dies and you need to rebuild on a new VPS:

1. Provision Ubuntu 24+ server.
2. Install: `apt install postgresql-18 postgresql-18-pgvector nginx docker.io certbot python3-certbot-nginx ufw rsync`.
3. Create PG role/db (see this repo's history for SQL, or check existing `.env.production` for the format).
4. Restore latest dump from `/var/backups/migip/` on the old server (or your laptop copy).
5. `git clone` this repo to `/opt/migip`, create `.env.production` (use existing secrets from password manager or rotate).
6. `docker build -t migip:latest .`; `docker run ...` (see "Deploying a code change" above).
7. Nginx config: copy `/etc/nginx/sites-available/migip` from old server.
8. `certbot --nginx -d migipdocs.ru -d www.migipdocs.ru`.
9. UFW: allow 22, 80, 443. Allow `172.17.0.0/16 to 5432` for Docker→PG.
10. Point DNS A records `migipdocs.ru` and `www.migipdocs.ru` at the new IP.
11. Update CF Worker `ALLOWED_IPS` to the new IP.
