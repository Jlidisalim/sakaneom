#!/usr/bin/env bash
# ==============================================================================
#  SAKANEOM — one-shot production deploy to a single Ubuntu VPS
# ------------------------------------------------------------------------------
#  WHAT IT DOES (idempotent — safe to re-run for redeploys):
#    1. Builds the app LOCALLY (the exact artifact tested in CI) with your
#       public URL baked in, then ships the self-contained .output/ to the VPS.
#    2. Provisions Ubuntu: Node 20, nginx, certbot, ufw firewall, a locked-down
#       `sakaneom` service user, and persistent data dirs OUTSIDE the deploy dir.
#    3. Installs a hardened systemd service (single instance, auto-restart).
#    4. Sets up nginx reverse proxy. If DOMAIN is set, also installs a FREE
#       Let's Encrypt TLS certificate (auto-renewing) and forces HTTP→HTTPS.
#    5. Runs a smoke test and tells you the admin login URL.
#
#  HOW TO RUN:
#    1. Fill in the CONFIG block below (IP, password, admin password).
#    2. Optional: set DOMAIN and point its DNS A record at the VPS IP.
#    3. From the project root:   bash deploy/deploy.sh
#
#  REQUIREMENTS ON YOUR MAC: bun, openssl, rsync, ssh  (+ sshpass if using a
#  password — the script tells you how to install it).
# ==============================================================================
set -euo pipefail

# ┌──────────────────────────────────────────────────────────────────────────┐
# │  CONFIG — FILL THESE IN                                                    │
# └──────────────────────────────────────────────────────────────────────────┘
VPS_IP="102.204.205.132"                 # e.g. 51.83.12.34
VPS_USER="root"                                 # SSH user (root, or a sudo-capable user)
VPS_PASSWORD="${VPS_PASSWORD:-}"   # Prefer key auth; optionally pass via environment (never commit it).
VPS_SSH_PORT="22"                               # SSH port (default 22)

DOMAIN=""                                        # optional for now. e.g. sakaneom.tn (A record must point at VPS_IP)
LETSENCRYPT_EMAIL=""                             # required only when DOMAIN is set, for TLS expiry notices

ADMIN_EMAIL="admin@sakaneom.tn"                  # first Super Admin login (created on first login)
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"             # min 12 chars — pass via environment (never commit it)
ADMIN_SESSION_SECRET="${ADMIN_SESSION_SECRET:-}" # reused from server if empty, else pass via environment

SEED_DEMO_DATA="false"                           # "true" loads 5 demo accounts + sample data (only if the store is empty)

# ── Fixed server paths (you normally don't need to change these) ──────────────
APP_DIR="/opt/sakaneom/app"                      # where .output lives (wiped & replaced each deploy)
DATA_DIR="/var/lib/sakaneom/data"                # PERSISTENT — leads, content, users, settings
UPLOAD_DIR="/var/lib/sakaneom/uploads"           # PERSISTENT — uploaded images
ENV_FILE="/etc/sakaneom/sakaneom.env"            # systemd EnvironmentFile (chmod 600)
SERVICE_USER="sakaneom"
APP_PORT="3000"                                  # node listens on 127.0.0.1:APP_PORT; nginx proxies to it
# ==============================================================================

# ----------------------------------------------------------------------------- helpers
c_red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
c_grn() { printf '\033[0;32m%s\033[0m\n' "$*"; }
c_ylw() { printf '\033[0;33m%s\033[0m\n' "$*"; }
c_bld() { printf '\033[1m%s\033[0m\n' "$*"; }
die()   { c_red "✗ $*"; exit 1; }
step()  { echo; c_bld "▶ $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ----------------------------------------------------------------------------- preflight
step "Preflight checks"
[ -f "$PROJECT_ROOT/package.json" ] || die "Run from the project (package.json not found at $PROJECT_ROOT)."
for v in VPS_IP ADMIN_PASSWORD; do
  val="$(eval "echo \${$v}")"
  case "$val" in REPLACE_*|"") die "Set $v in the CONFIG block at the top of this script." ;; esac
done
case "$ADMIN_PASSWORD" in REPLACE_*) die "Set ADMIN_PASSWORD." ;; esac
[ "${#ADMIN_PASSWORD}" -ge 12 ] || die "ADMIN_PASSWORD must be at least 12 characters (got ${#ADMIN_PASSWORD})."
case "$DOMAIN" in REPLACE_*) die "Set DOMAIN to a real domain, or leave DOMAIN=\"\" to deploy by server IP for now." ;; esac
case "$LETSENCRYPT_EMAIL" in REPLACE_*) die "Set LETSENCRYPT_EMAIL, or leave it empty when DOMAIN=\"\"." ;; esac
if [ -n "$DOMAIN" ] && [ -z "$LETSENCRYPT_EMAIL" ]; then
  die "Set LETSENCRYPT_EMAIL when DOMAIN is set, or leave DOMAIN=\"\" to skip TLS/domain setup."
fi
command -v bun >/dev/null     || die "bun not found. Install from https://bun.sh then re-run."
command -v openssl >/dev/null || die "openssl not found."
command -v rsync >/dev/null   || die "rsync not found."
command -v ssh >/dev/null     || die "ssh not found."

# SSH transport: password (sshpass) or key.
SSH_BASE=(ssh -p "$VPS_SSH_PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
RSYNC_RSH="ssh -p $VPS_SSH_PORT -o StrictHostKeyChecking=accept-new"
USE_SSHPASS=0
if [ -n "$VPS_PASSWORD" ] && [ "$VPS_PASSWORD" != "REPLACE_WITH_SSH_PASSWORD" ]; then
  if ! command -v sshpass >/dev/null; then
    c_red "sshpass is required for password auth but is not installed."
    c_ylw "  macOS:  brew install hudochenkov/sshpass/sshpass"
    c_ylw "  Ubuntu: sudo apt-get install -y sshpass"
    c_ylw "  (or leave VPS_PASSWORD=\"\" and use an SSH key instead)"
    die "Install sshpass and re-run."
  fi
  USE_SSHPASS=1
  RSYNC_RSH="sshpass -p $VPS_PASSWORD $RSYNC_RSH"
fi
ssh_run() {  # run a command on the VPS
  if [ "$USE_SSHPASS" = 1 ]; then sshpass -p "$VPS_PASSWORD" "${SSH_BASE[@]}" "$VPS_USER@$VPS_IP" "$@";
  else "${SSH_BASE[@]}" "$VPS_USER@$VPS_IP" "$@"; fi
}
ssh_put() {  # copy a local file to a remote path: ssh_put <local> <remote>
  if [ "$USE_SSHPASS" = 1 ]; then sshpass -p "$VPS_PASSWORD" scp -P "$VPS_SSH_PORT" -o StrictHostKeyChecking=accept-new "$1" "$VPS_USER@$VPS_IP:$2";
  else scp -P "$VPS_SSH_PORT" -o StrictHostKeyChecking=accept-new "$1" "$VPS_USER@$VPS_IP:$2"; fi
}

step "Testing SSH connection to $VPS_USER@$VPS_IP:$VPS_SSH_PORT"
ssh_run 'echo ok && id' >/dev/null 2>&1 || die "SSH connection failed. Check VPS_IP / VPS_USER / VPS_PASSWORD / port / firewall."
c_grn "✓ SSH OK"

if [ -n "$DOMAIN" ]; then
  PUBLIC_ORIGIN="https://$DOMAIN"
  NGINX_SERVER_NAME="$DOMAIN"
  PUBLIC_SMOKE_HOST="$DOMAIN"
  c_grn "✓ Domain mode: $DOMAIN (HTTPS/TLS will be configured)"
else
  PUBLIC_ORIGIN="http://$VPS_IP"
  NGINX_SERVER_NAME="_"
  PUBLIC_SMOKE_HOST="$VPS_IP"
  c_ylw "Domain skipped: deploying over http://$VPS_IP for now. Re-run later with DOMAIN set for HTTPS."
fi

# ----------------------------------------------------------------------------- build locally
step "Building production bundle locally (VITE_SITE_URL=$PUBLIC_ORIGIN)"
( cd "$PROJECT_ROOT" \
  && NODE_ENV=production SITE_URL="$PUBLIC_ORIGIN" VITE_SITE_URL="$PUBLIC_ORIGIN" bun run build ) \
  || die "Build failed. Fix the build, then re-run."
[ -f "$PROJECT_ROOT/.output/server/index.mjs" ] || die ".output/server/index.mjs missing after build."
c_grn "✓ Built .output ($(du -sh "$PROJECT_ROOT/.output" | cut -f1))"

# ----------------------------------------------------------------------------- session secret (reuse if present)
step "Resolving ADMIN_SESSION_SECRET"
if [ -z "$ADMIN_SESSION_SECRET" ]; then
  EXISTING="$(ssh_run "grep -h '^ADMIN_SESSION_SECRET=' $ENV_FILE 2>/dev/null | head -1 | cut -d= -f2- || true" 2>/dev/null || true)"
  if [ -n "$EXISTING" ] && [ "${#EXISTING}" -ge 32 ]; then
    ADMIN_SESSION_SECRET="$EXISTING"; c_grn "✓ Reusing existing session secret from the server (keeps users logged in)."
  else
    ADMIN_SESSION_SECRET="$(openssl rand -hex 32)"; c_grn "✓ Generated a new 64-char session secret."
  fi
fi

# ----------------------------------------------------------------------------- optional: seed locally -> ship JSON
SEED_PUSH=0
if [ "$SEED_DEMO_DATA" = "true" ]; then
  step "Seeding demo data locally (will only be applied if the server store is empty)"
  SEED_TMP="$PROJECT_ROOT/.deploy-seed"
  rm -rf "$SEED_TMP"; mkdir -p "$SEED_TMP/data" "$SEED_TMP/uploads"
  ( cd "$PROJECT_ROOT" && DATA_DIR="$SEED_TMP/data" UPLOAD_DIR="$SEED_TMP/uploads" bun run seed ) || die "Seed failed."
  SEED_PUSH=1
  c_grn "✓ Demo data generated."
fi

# ----------------------------------------------------------------------------- write provisioning script + env locally
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/sakaneom.env" <<ENVEOF
# Managed by deploy/deploy.sh — runtime environment for the SAKANEOM service.
NODE_ENV=production
HOST=127.0.0.1
PORT=$APP_PORT
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_SESSION_SECRET=$ADMIN_SESSION_SECRET
DATA_DIR=$DATA_DIR
UPLOAD_DIR=$UPLOAD_DIR
SITE_URL=$PUBLIC_ORIGIN
ENVEOF

cat > "$TMP/provision.sh" <<PROVEOF
#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR="$APP_DIR"; DATA_DIR="$DATA_DIR"; UPLOAD_DIR="$UPLOAD_DIR"
ENV_FILE="$ENV_FILE"; SERVICE_USER="$SERVICE_USER"; APP_PORT="$APP_PORT"
DOMAIN="$DOMAIN"; LE_EMAIL="$LETSENCRYPT_EMAIL"; NGINX_SERVER_NAME="$NGINX_SERVER_NAME"

echo "── Installing packages (Node 20, nginx, certbot, ufw, rsync) ──"
apt-get update -y -qq
apt-get install -y -qq ca-certificates curl gnupg rsync ufw nginx >/dev/null
if ! command -v node >/dev/null || ! node -v | grep -q '^v2[0-9]'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
fi
apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
echo "   node \$(node -v) / nginx \$(nginx -v 2>&1 | sed 's#nginx version: ##')"

echo "── Service user + persistent dirs (outside the deploy dir) ──"
id -u "\$SERVICE_USER" >/dev/null 2>&1 || useradd --system --home /var/lib/sakaneom --shell /usr/sbin/nologin "\$SERVICE_USER"
mkdir -p "\$APP_DIR" "\$DATA_DIR" "\$UPLOAD_DIR" /etc/sakaneom /var/backups/sakaneom
chown -R "\$SERVICE_USER":"\$SERVICE_USER" /var/lib/sakaneom "\$APP_DIR"
chmod 750 /var/lib/sakaneom

echo "── systemd service (single instance, hardened, auto-restart) ──"
cat > /etc/systemd/system/sakaneom.service <<UNIT
[Unit]
Description=SAKANEOM (TanStack Start node server)
After=network.target

[Service]
Type=simple
User=\$SERVICE_USER
Group=\$SERVICE_USER
WorkingDirectory=\$APP_DIR
EnvironmentFile=\$ENV_FILE
ExecStart=/usr/bin/node \$APP_DIR/.output/server/index.mjs
Restart=always
RestartSec=2
# Exactly ONE instance — the JSON store is single-writer (see docs/DEPLOY.md).
# Hardening:
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/sakaneom
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
UNIT
chmod 600 "\$ENV_FILE" 2>/dev/null || true
chown root:root "\$ENV_FILE" 2>/dev/null || true
systemctl daemon-reload

echo "── nginx reverse proxy (HTTP first; certbot adds TLS next) ──"
cat > /etc/nginx/sites-available/sakaneom <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name \$NGINX_SERVER_NAME;

  # Reject oversized bodies at the edge (uploads are capped at 8 MB in-app).
  client_max_body_size 12m;

  location / {
    proxy_pass http://127.0.0.1:\$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \\\$host;
    proxy_set_header X-Real-IP \\\$remote_addr;
    proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \\\$scheme;
    proxy_set_header X-Forwarded-Host \\\$host;
    proxy_read_timeout 60s;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/sakaneom /etc/nginx/sites-enabled/sakaneom
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "── Firewall (ufw): allow SSH + HTTP + HTTPS ──"
ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || { ufw allow 80/tcp >/dev/null 2>&1; ufw allow 443/tcp >/dev/null 2>&1; }
yes | ufw enable >/dev/null 2>&1 || true

echo "── Start the app service ──"
systemctl enable sakaneom >/dev/null 2>&1 || true
systemctl restart sakaneom
sleep 2
for i in \$(seq 1 30); do
  code=\$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:\$APP_PORT/" || true)
  [ "\$code" = "200" ] && break; sleep 1
done
if [ "\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:\$APP_PORT/ || true)" != "200" ]; then
  echo "!! App did not return 200 on 127.0.0.1:\$APP_PORT — recent logs:"; journalctl -u sakaneom -n 40 --no-pager || true
  exit 1
fi
echo "   app healthy on 127.0.0.1:\$APP_PORT"

if [ -n "\$DOMAIN" ]; then
  echo "── TLS: obtaining/renewing Let's Encrypt certificate for \$DOMAIN ──"
  if certbot --nginx -d "\$DOMAIN" --non-interactive --agree-tos -m "\$LE_EMAIL" --redirect --keep-until-expiring; then
    echo "   TLS active (auto-renew via certbot systemd timer)."
  else
    echo "!! certbot failed — is \$DOMAIN's DNS A record pointing at this server yet?"
    echo "   The site is live over HTTP; re-run this script once DNS resolves to enable HTTPS."
  fi
else
  echo "── TLS skipped (DOMAIN is empty). Site is live over HTTP by server IP. ──"
fi
systemctl reload nginx || true

echo "── Daily backup of the data dir (kept 30 days) ──"
cat > /etc/cron.daily/sakaneom-backup <<'CRON'
#!/usr/bin/env bash
ts=\$(date +%F-%H%M)
tar czf "/var/backups/sakaneom/data-\$ts.tar.gz" -C /var/lib/sakaneom data uploads 2>/dev/null || true
find /var/backups/sakaneom -name 'data-*.tar.gz' -mtime +30 -delete 2>/dev/null || true
CRON
chmod +x /etc/cron.daily/sakaneom-backup

echo "PROVISION_OK"
PROVEOF

# ----------------------------------------------------------------------------- push everything
step "Provisioning the VPS (packages, user, dirs, service, nginx, firewall)"
ssh_run "mkdir -p '$APP_DIR' /etc/sakaneom" || die "Could not create remote dirs (need sudo/root)."
ssh_put "$TMP/provision.sh" "/tmp/sakaneom-provision.sh"
ssh_put "$TMP/sakaneom.env" "$ENV_FILE"

step "Uploading the built app to $APP_DIR/.output"
# --delete keeps .output clean; data lives elsewhere so nothing precious is here.
# $RSYNC_RSH already carries sshpass (password mode) or plain ssh (key mode).
rsync -az --delete -e "$RSYNC_RSH" "$PROJECT_ROOT/.output/" "$VPS_USER@$VPS_IP:$APP_DIR/.output/"
c_grn "✓ App uploaded"

if [ "$SEED_PUSH" = 1 ]; then
  step "Applying demo data (only fills empty collections)"
  ssh_run "test -n \"\$(ls -A '$DATA_DIR' 2>/dev/null | grep -v '^\\.' || true)\"" \
    && c_ylw "  Server data dir is not empty — skipping seed to protect existing data." \
    || { rsync -az -e "$RSYNC_RSH" "$PROJECT_ROOT/.deploy-seed/data/" "$VPS_USER@$VPS_IP:$DATA_DIR/"; c_grn "  ✓ Demo data applied."; }
  rm -rf "$PROJECT_ROOT/.deploy-seed"
fi

step "Running remote provisioning"
# pipefail (set -o at top) makes a provision.sh failure propagate through the pipe.
ssh_run "bash /tmp/sakaneom-provision.sh" | sed 's/^/   /'

# ----------------------------------------------------------------------------- final smoke test
step "Smoke test over the public URL"
HTTPS_CODE="skipped"
if [ -n "$DOMAIN" ]; then
  HTTPS_CODE="$(curl -s -k -o /dev/null -w '%{http_code}' "https://$PUBLIC_SMOKE_HOST/" || true)"
fi
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://$PUBLIC_SMOKE_HOST/" || true)"
SVC="$(ssh_run 'systemctl is-active sakaneom' 2>/dev/null || echo unknown)"

echo
c_bld "──────────────────────────────────────────────────────────────"
if [ "$HTTPS_CODE" = "200" ]; then
  c_grn "✓ DEPLOY OK — https://$DOMAIN/ returned 200"
elif [ "$HTTP_CODE" = "200" ]; then
  if [ -n "$DOMAIN" ]; then
    c_ylw "✓ App is live over HTTP (http://$DOMAIN/ → 200), but HTTPS isn't 200 yet."
    c_ylw "  Usually means DNS for $DOMAIN isn't fully pointing here. Re-run once it does."
  else
    c_grn "✓ DEPLOY OK — http://$VPS_IP/ returned 200 (domain/TLS skipped)"
  fi
else
  c_red "✗ Site did not return 200 (https=$HTTPS_CODE http=$HTTP_CODE). Service status: $SVC"
  c_ylw "  Inspect logs:  ssh $VPS_USER@$VPS_IP 'journalctl -u sakaneom -n 50 --no-pager'"
fi
echo
c_bld "Service:        $SVC (systemctl status sakaneom)"
c_bld "Admin panel:    $PUBLIC_ORIGIN/admin"
c_bld "First login:    $ADMIN_EMAIL  /  (the ADMIN_PASSWORD you set)"
c_bld "Data (backup):  $DATA_DIR  +  $UPLOAD_DIR   → /var/backups/sakaneom (daily)"
c_bld "Logs:           ssh $VPS_USER@$VPS_IP 'journalctl -u sakaneom -f'"
c_bld "Redeploy:       just re-run  bash deploy/deploy.sh  (sessions & data preserved)"
[ -z "$DOMAIN" ] && c_bld "Add domain:     set DOMAIN + LETSENCRYPT_EMAIL later, point DNS A record to $VPS_IP, then re-run"
c_bld "──────────────────────────────────────────────────────────────"
