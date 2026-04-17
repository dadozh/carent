# Raspberry Pi 5 Deployment

This app can coexist with the existing `kono-bro` deployment on the same Raspberry Pi 5, but it must not bind to the same public port. The deployment bundle is intended to be copied to the Pi and installed there. There is no local SSH wrapper in the deployment flow.

## Hosting model

- `kono-bro` stays untouched
- Carent runs as a separate PM2 app named `carent`
- Carent listens on internal port `3002`
- `lighttpd` should proxy a separate hostname such as `carent.xidea.ch` to `127.0.0.1:3002`
- Carent keeps its own app directory, logs, and SQLite DB under `/opt/carent`

## Current Pi findings

Inspected host:

- SSH target: `dadox@192.168.1.217`
- hostname: `kono-bro`
- existing app directory: `/opt/kono-bro`
- existing app manager: `PM2`
- running app: `kono-bro`
- public listening ports already in use:
  - `80`
  - `443`
  - `22`

Current `kono-bro` runtime pattern:

- `kono-bro` is started by PM2
- it binds directly to `PORT=443`
- it reads Let’s Encrypt files directly from `/etc/letsencrypt/live/...`

Current architecture consequence:

- while `kono-bro` binds directly to `443`, `lighttpd` cannot also terminate HTTPS for Carent on `443`
- proxy-terminated HTTPS for Carent therefore requires one of these changes:
  - move `kono-bro` behind `lighttpd` too
  - or stop using the Pi’s shared `443` entrypoint for `kono-bro`

Existing Let’s Encrypt material on the Pi:

- `/etc/letsencrypt/live/kono-bro1.xidea.ch/`
- `/etc/letsencrypt/live/konobro.xidea.ch/`
- `/etc/letsencrypt/live/dado.internet-box.ch/`

## Port 443 ownership

DNS is ready (`carent.xidea.ch` and `*.carent.xidea.ch` resolve to the Pi public IP).

`kono-bro` currently binds directly to port `443` with Node.js TLS. Only one process can own a port, so both apps cannot share `443`. The solution is to move `lighttpd` onto `443` as the TLS terminator and reverse proxy for both apps:

| App | Internal port | Public hostname |
|---|---|---|
| kono-bro | 127.0.0.1:3001 | konobro.xidea.ch |
| carent | 127.0.0.1:3002 | carent.xidea.ch |
| lighttpd | 0.0.0.0:443 | terminates TLS for both |

### Changes required in kono-bro

`kono-bro` must stop terminating TLS itself and move to an internal port. Two places to update:

1. **Pi runtime** — `/opt/kono-bro/.env.production`:
   ```
   PORT=3001
   HTTPS_ENABLED=false
   ```

2. **kono-bro repo** — `ecosystem.config.js`: change the default `PORT: 443` to `PORT: 3001` in both `env` and `env_production` blocks, so future deploys don't revert it.

After updating kono-bro: `pm2 reload ecosystem.config.js --env production`

## Files added

- `ecosystem.config.js`
- `deploy/carent.env.production.example`
- `deploy/lighttpd-carent.conf.example`
- `scripts/pi-install.sh`
- `scripts/pi-upgrade.sh`
- `scripts/pi-package.sh`

## Deployment package

Build the deployment archive locally:

```bash
npm run pi:package
```

This creates:

- `dist/carent-pi-deploy.tar.gz`

What is inside the archive:

- application source
- `ecosystem.config.js`
- `deploy/carent.env.production.example`
- `deploy/lighttpd-carent.conf.example`
- `scripts/pi-install.sh`
- `scripts/pi-upgrade.sh`

What is intentionally not inside the archive:

- `.env.production`
- `node_modules`
- `.next`
- local database files

Copy the archive to the Pi, extract it, then run the installer from inside the extracted directory.

Example copy command from the workstation:

```bash
scp dist/carent-pi-deploy.tar.gz dadox@192.168.1.217:~/
```

Example extraction on the Pi:

```bash
mkdir -p ~/carent-release
tar -xzf ~/carent-pi-deploy.tar.gz -C ~/carent-release
cd ~/carent-release/pi-package
```

## Install script

First-time install on the Pi:

```bash
cd ~/carent-release/pi-package
bash scripts/pi-install.sh
```

What it does:

1. creates `/opt/carent` with `sudo`
2. copies the deployment package into `/opt/carent`
3. creates `.env.production` from the example if missing
4. generates an `AUTH_SECRET` automatically on first install
5. installs dependencies
6. loads `.env.production`
7. runs explicit SQLite migrations against `CARENT_DB_PATH`
8. builds the app
9. starts Carent under PM2 on `127.0.0.1:3002`

Resulting layout on the Pi:

- `/opt/carent`
- `/opt/carent/.env.production`
- `/opt/carent/data/carent.sqlite`
- `/opt/carent/logs/`

## Upgrade script

Subsequent deploys on the Pi:

```bash
mkdir -p ~/carent-release
rm -rf ~/carent-release/pi-package
tar -xzf ~/carent-pi-deploy.tar.gz -C ~/carent-release
cd ~/carent-release/pi-package
rsync -az --delete \
  --exclude ".env.production" \
  ./ /opt/carent/
bash /opt/carent/scripts/pi-upgrade.sh
```

What it does:

1. expects the new package contents to already be copied into `/opt/carent`
2. preserves `.env.production`
3. runs dependency install
4. loads `.env.production`
5. runs explicit SQLite migrations against `CARENT_DB_PATH`
6. rebuilds the app
7. reloads the PM2 process

This upgrade flow preserves:

- `/opt/carent/.env.production`
- `/opt/carent/data/`
- PM2 process name `carent`

## First-time setup on the Pi

1. Build `dist/carent-pi-deploy.tar.gz`
2. Copy the archive to the Pi
3. Ensure Node.js 20+, npm, PM2, and `rsync` are installed
4. Extract the archive on the Pi
5. Run the install script on the Pi:

```bash
mkdir -p ~/carent-release
tar -xzf ~/carent-pi-deploy.tar.gz -C ~/carent-release
cd ~/carent-release/pi-package
bash scripts/pi-install.sh
```

Defaults:

- app dir: `/opt/carent`

Override if needed:

```bash
APP_DIR=/opt/carent bash scripts/pi-install.sh
APP_DIR=/opt/carent bash /opt/carent/scripts/pi-upgrade.sh
```

## Runtime and env

PM2 process:

- name: `carent`
- cwd: `/opt/carent`
- internal bind: `127.0.0.1:3002`

Required production env file:

- path: `/opt/carent/.env.production`

Important variables:

- `PORT=3002`
- `HOSTNAME=127.0.0.1`
- `AUTH_SECRET=...`
- `CARENT_DB_PATH=/opt/carent/data/carent.sqlite`

The installer creates `.env.production` from `deploy/carent.env.production.example` only when the file does not already exist.

After first install, review and edit:

```bash
nano /opt/carent/.env.production
```

Useful runtime checks on the Pi:

```bash
pm2 status
pm2 logs carent
ss -tulpn | grep 3002
curl -I http://127.0.0.1:3002
```

## Database migrations

Deploys now use an explicit migration step instead of relying only on lazy runtime schema changes.

Command:

```bash
npm run migrate
```

What it does:

- opens the SQLite database at `CARENT_DB_PATH`
- creates a `schema_migrations` table
- applies idempotent schema upgrades in order
- seeds the default tenant and default admin accounts if they are missing

This command is run automatically by both:

- `scripts/pi-install.sh`
- `scripts/pi-upgrade.sh`

If you need to run it manually on the Pi:

```bash
cd /opt/carent
set -a
. ./.env.production
set +a
npm run migrate
```

## lighttpd routing

`lighttpd` is already installed and active on the Pi (serving RaspAP on port 80). It needs to be extended to also own port 443 and proxy both apps by hostname.

### Step-by-step

```bash
# 1. Move kono-bro off 443 (edit .env.production, then reload)
sudo nano /opt/kono-bro/.env.production
#   PORT=3001
#   HTTPS_ENABLED=false
pm2 reload kono-bro

# 2. Issue cert for carent.xidea.ch (lighttpd serves port 80 for the challenge)
sudo certbot certonly --webroot -w /var/www/html -d carent.xidea.ch

# 3. Enable required lighttpd modules
sudo lighttpd-enable-mod openssl proxy

# 4. Install the combined vhost config
sudo cp /opt/carent/deploy/lighttpd-carent.conf.example \
        /etc/lighttpd/conf-available/90-carent-proxy.conf
sudo lighttpd-enable-mod carent-proxy   # or symlink manually

# 5. Also add a kono-bro proxy vhost (see deploy/lighttpd-konobro.conf.example)

# 6. Reload lighttpd
sudo systemctl reload lighttpd

# 7. Start carent under PM2
pm2 startOrReload /opt/carent/ecosystem.config.js --env production
pm2 save
```

See `deploy/lighttpd-carent.conf.example` for the Carent proxy vhost.
A matching `deploy/lighttpd-konobro.conf.example` is needed for kono-bro (to be added to that repo).

## Notes

- This project uses `next build` + `next start`, which matches Next 16 self-hosting guidance behind a reverse proxy
- The SQLite DB path is intentionally separate from `kono-bro`
- Logs are intentionally separate from `kono-bro`
- Do not set Carent to `PORT=443` while `kono-bro` is still live on that machine
- Changing `lighttpd` config and issuing the certificate on the Pi will require `sudo`
- First-time install will also require `sudo` on the Pi because `/opt/carent` must be created there
