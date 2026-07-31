# SAKANEOM — one-command production deploy

`deploy/deploy.sh` provisions a fresh **Ubuntu VPS** and ships the app end-to-end:
Node 24 LTS · nginx reverse-proxy · optional **free auto-renewing HTTPS** (Let's Encrypt) ·
hardened `systemd` service · firewall · daily backups. It is **idempotent** —
re-run it any time to redeploy (data and logged-in sessions are preserved).

The app is **built on your Mac** (the exact artifact CI tests) and only the
self-contained `.output/` is uploaded, so the server needs no build toolchain.

---

## 1. Prerequisites

**On the VPS:** a clean Ubuntu 22.04/24.04 (or Debian 12) with SSH access as
`root` (or a sudo user). Nothing else — the script installs everything.

**On your Mac:** `bun`, `openssl`, `rsync`, `ssh` (you have these), plus
**`sshpass`** if you log in with a password:

```bash
brew install hudochenkov/sshpass/sshpass     # only needed for password SSH
```

**DNS (optional now):** you can leave `DOMAIN=""` and deploy by VPS IP over
HTTP first. When you are ready for the domain, point its **A record at the VPS
IP**, set `DOMAIN` + `LETSENCRYPT_EMAIL`, and re-run the same script to enable
HTTPS. Apex example: `sakaneom.tn  A  <VPS_IP>`.

---

## 2. Fill in the config (the only thing you edit)

Open `deploy/deploy.sh` and edit the **CONFIG block** at the top:

| Field                  | What to put                                                            |
| ---------------------- | --------------------------------------------------------------------- |
| `VPS_IP`               | Your server's public IP, e.g. `51.83.12.34`                           |
| `VPS_USER`             | SSH user — usually `root`                                              |
| `VPS_PASSWORD`         | SSH password. **Leave `""`** to use your SSH key instead.             |
| `DOMAIN`               | Optional now. Leave `""` to deploy by VPS IP, or set e.g. `sakaneom.tn` |
| `LETSENCRYPT_EMAIL`    | Required only when `DOMAIN` is set (TLS expiry notices)                |
| `ADMIN_EMAIL`          | First Super-Admin login email                                         |
| `ADMIN_PASSWORD`       | Your admin password — **min 12 chars**                                |
| `ADMIN_SESSION_SECRET` | Leave `""` — auto-generated (and reused on redeploys)                 |
| `SEED_DEMO_DATA`       | `"false"` (clean start) or `"true"` (load 5 demo accounts + samples)  |

`ADMIN_SESSION_SECRET` is generated with `openssl rand -hex 32` on first deploy
and **reused from the server** on later deploys, so users stay logged in.

> 🔒 The password and admin secret live only in this local file and in
> `/etc/sakaneom/sakaneom.env` on the server (`chmod 600`, root-owned). Don't
> commit your filled-in copy. `.env.local` and `.deploy-seed` are already
> gitignored.

---

## 3. Run it

```bash
bash deploy/deploy.sh
```

It will: test SSH → build locally → upload `.output` → install packages →
create the service user + persistent dirs → write the systemd unit + nginx site
→ obtain HTTPS when `DOMAIN` is set → start the service → smoke-test the public URL.

On success you'll see the admin URL and management commands.

---

## 4. After deploy — managing the box

```bash
# health / status / logs
ssh root@<VPS_IP> 'systemctl status sakaneom'
ssh root@<VPS_IP> 'journalctl -u sakaneom -f'

# restart / stop
ssh root@<VPS_IP> 'systemctl restart sakaneom'

# where the data lives (the whole "database") + automatic daily backups
#   data:    /var/lib/sakaneom/data        (leads, content, users, settings)
#   uploads: /var/lib/sakaneom/uploads     (images)
#   backups: /var/backups/sakaneom/data-*.tar.gz   (kept 30 days)
```

First login: open the admin URL printed by the script, sign in with
`ADMIN_EMAIL` / `ADMIN_PASSWORD`. That first login creates the real Super-Admin
account.

**Redeploy:** just run `bash deploy/deploy.sh` again.

---

## What the server ends up running

- **systemd** `sakaneom.service`: one Node process (`User=sakaneom`, no shell),
  `Restart=always`, sandboxed (`ProtectSystem=strict`, `NoNewPrivileges`,
  writable only under `/var/lib/sakaneom`). Reads env from
  `/etc/sakaneom/sakaneom.env`; binds `127.0.0.1:3000` (not public).
- **nginx**: TLS termination + reverse proxy to `127.0.0.1:3000`, forwards
  `X-Forwarded-Proto`, `client_max_body_size 12m` (rejects oversized uploads at
  the edge — uploads are also capped at 8 MB in-app).
- **certbot**: HTTPS cert with automatic renewal (systemd timer), `--redirect`
  forces HTTP→HTTPS.
- **ufw**: only SSH (22), HTTP (80), HTTPS (443) open.

The app refuses to boot in production unless `ADMIN_PASSWORD` (≥12),
`ADMIN_SESSION_SECRET` (≥32), `DATA_DIR` and `UPLOAD_DIR` are all set — the
script always sets them, so a misconfigured/forgotten value can't silently lose
data.

---

## Production-readiness status (what was verified)

Before writing this deploy, the project was audited and hardened:

- ✅ `bun run typecheck`, `bun run lint`, `bun run test` (28 tests) — all green.
- ✅ Production build emits a self-contained Node server; **boot-tested**: serves
  `/`, `/admin`, `/robots.txt`, `/sitemap.xml`; all security headers present
  (CSP, HSTS, X-Frame-Options, nosniff); refuses to boot with weak/missing
  secrets or unset data dirs.
- ✅ Fixed a **privilege-escalation** bug (a `commercial` could create/modify/
  delete other agents' rendez-vous via direct calls) — ownership now enforced
  server-side in `src/lib/promo/api.ts`.
- ✅ Added a **storage config guard** so a redeploy can never wipe data by
  defaulting `DATA_DIR`/`UPLOAD_DIR` inside the build dir.
- ✅ Explicit session-cookie flags (httpOnly, Secure in prod, SameSite=Lax) and
  write-failure logging.

### Deferred (non-blocking) hardening backlog

These were surfaced by the audit and judged safe to defer given the
**single-instance** deploy this script produces. Worth doing later:

| Item | Why it's safe for now |
| ---- | --------------------- |
| Rate-limit errors aren't proper HTTP `429` (Retry-After) | Limiter still blocks brute-force/spam; only the client status code/UX is imperfect. |
| Graceful `SIGTERM` drain on restart | Writes are atomic (temp-file + rename) so no corruption; orphaned `*.tmp` are now swept at startup. At most the last in-flight write is lost on restart. |
| In-memory rate-limiter / single-writer JSON store not enforced against multi-instance | The systemd unit runs **exactly one** instance; don't add PM2 cluster/replicas. Migrate to a DB/KV adapter before scaling out. |
| Runtime `503` if disk fails mid-request (vs startup) | Startup probe covers boot; a mid-run disk failure surfaces as a logged 500 error page. |
| Admin-set video `src` URL not domain-restricted (SSRF-ish) | Requires a *trusted* Super-Admin/Manager to act maliciously. |

See the full audit reasoning in the deploy conversation / `docs/DEPLOY.md`.
