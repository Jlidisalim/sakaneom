# SAKANEOM — Deployment (single Node VPS)

SAKANEOM runs as **one long-lived Node process** on a VPS (OVH) that also hosts
the data. Content, leads, analytics and uploaded images are persisted to disk via
the filesystem `StorageAdapter` (`src/server/storage.ts`). This document is the
contract that keeps that data durable.

> ⚡ **Automated path:** `deploy/deploy.sh` does everything below for you on a
> fresh Ubuntu VPS — packages, hardened systemd service, nginx + Let's Encrypt
> HTTPS, firewall, daily backups, smoke test. Fill in IP/domain/admin password
> and run `bash deploy/deploy.sh`. See [`deploy/README.md`](../deploy/README.md).
> The rest of this file is the manual reference / contract it implements.

## ⚠️ Three rules that protect your data

1. **Persistent dirs OUTSIDE the deploy directory.** Set `DATA_DIR` and
   `UPLOAD_DIR` to a stable path the deploy never touches. If they sit inside the
   checkout/build dir, an `rsync --delete`, fresh `git clone`, or container
   rebuild **erases every lead**.

   ```
   DATA_DIR=/var/lib/sakaneom/data
   UPLOAD_DIR=/var/lib/sakaneom/uploads
   ```

   Create them once: `sudo mkdir -p /var/lib/sakaneom/{data,uploads}` and give the
   app user write access.

2. **Exactly ONE instance.** The adapter serializes writes within a single
   process only. Do **not** run PM2 cluster mode, multiple replicas, or a
   load-balanced fleet against the same disk — concurrent writers corrupt the
   JSON. Scale vertically, or migrate to a KV/DB adapter first (the interface is
   ready for it).

3. **Back it up.** `DATA_DIR` is the whole database. Snapshot it on a schedule
   and test a restore (see Backups below).

## Build & run

The build is pinned to Nitro's `node-server` preset (`vite.config.ts`), so it
emits a standalone Node server under `.output/`:

```bash
bun install
bun run build                # → .output/ (client + node server)
node .output/server/index.mjs   # or your process manager (single instance)
```

The server listens on `PORT` (default 3000). Run it behind nginx (below). Note
`.output/` is gitignored — build on the box (or in CI) and run from there.

Required environment (production refuses to boot without **all** of these):

```
NODE_ENV=production
ADMIN_PASSWORD=...            # min 12 chars
ADMIN_SESSION_SECRET=...      # min 32 chars — openssl rand -hex 24
DATA_DIR=/var/lib/sakaneom/data       # must be set in prod (else redeploy wipes data)
UPLOAD_DIR=/var/lib/sakaneom/uploads  # must be set in prod
```

`assertAuthConfig()` (auth) and `assertStorageConfig()` (storage) both throw on a
misconfigured production boot, so the server fails loudly instead of starting with
default credentials or a data dir that a redeploy would erase.

On boot the server runs a **storage probe** (write + read-back + delete in
`DATA_DIR`). If the dir isn't writable it logs `[storage] NOT writable` and
returns 503 — fail fast instead of silently losing data. A healthy start logs
`[storage] ready — fs adapter — data:… uploads:…`.

## Uploads

Uploaded images are written to `UPLOAD_DIR` at runtime, so they are **not** part
of the static build. The server serves them itself at `/uploads/*`
(`src/server.ts` → `serveUpload`), with a long immutable cache and `nosniff`.
If you put nginx in front, you may instead serve `/uploads/` directly from
`UPLOAD_DIR` for efficiency — both work; the Node route is the portable default.

## Reverse proxy / TLS (nginx sketch)

Terminate TLS at nginx and proxy to the Node server. Force HTTPS and pin the app
to localhost:

```nginx
server {
  listen 443 ssl http2;
  server_name sakaneom.example;
  # ssl_certificate ... (certbot/Let's Encrypt, auto-renew)
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  # optional: serve uploads straight from disk
  # location /uploads/ { alias /var/lib/sakaneom/uploads/; }
}
server { listen 80; server_name sakaneom.example; return 301 https://$host$request_uri; }
```

> ⚠️ UNVERIFIED here (needs the live box): TLS cert + auto-renew, DNS records,
> www↔apex + http→https redirects, and the session cookie's `Secure`/`SameSite`
> flags on the deployed response. Verify with `curl -I https://…` after deploy.

## Monitoring

Server errors flow through `captureServerError` (`src/lib/monitoring.ts`), which
emits a structured JSON line to stderr — so `journalctl -u sakaneom` (or your log
shipper) already captures them. To forward to **Sentry**: `bun add @sentry/node`,
set `SENTRY_DSN`, and uncomment the `captureException` hook in that file. Add the
matching browser SDK in the root error boundary for client errors.

> ⚠️ UNVERIFIED here: actual Sentry/APM wiring + alerting need the DSN and a live
> environment.

## Backups

`DATA_DIR` is small JSON — back it up cheaply and often:

```bash
# /etc/cron.daily/sakaneom-backup  (chmod +x)
ts=$(date +%F-%H%M)
tar czf /var/backups/sakaneom/data-$ts.tar.gz -C /var/lib/sakaneom data uploads
find /var/backups/sakaneom -name 'data-*.tar.gz' -mtime +30 -delete
```

Test a restore at least once: stop the app, extract a snapshot into a scratch
dir, point `DATA_DIR`/`UPLOAD_DIR` at it, boot, confirm leads/content load.
