#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/carent}"
SOURCE_DIR="${SOURCE_DIR:-$(pwd)}"
PI_USER="${PI_USER:-$(id -un)}"
PI_GROUP="${PI_GROUP:-$(id -gn)}"

echo "Preparing first-time Carent install"
echo "  source: ${SOURCE_DIR}"
echo "  target: ${APP_DIR}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not installed." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "PM2 is required but not installed." >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required on the Pi." >&2
  exit 1
fi

sudo mkdir -p "${APP_DIR}"
sudo chown -R "${PI_USER}:${PI_GROUP}" "${APP_DIR}"

rsync -az --delete \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude ".data" \
  --exclude ".env.local" \
  --exclude ".env.production" \
  "${SOURCE_DIR}/" "${APP_DIR}/"

mkdir -p "${APP_DIR}/logs" "${APP_DIR}/data"
cd "${APP_DIR}"

if [ ! -f ".env.production" ]; then
  cp deploy/carent.env.production.example .env.production
  AUTH_SECRET="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
  sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=${AUTH_SECRET}/" .env.production
  echo "Created ${APP_DIR}/.env.production with a generated AUTH_SECRET."
  echo "Review and adjust the environment file before exposing the app publicly."
fi

echo "Installing dependencies"
npm ci

set -a
. ./.env.production
set +a

echo "Running database migrations"
npm run migrate

echo "Building application"
npm run build

echo "Starting PM2 process"
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "First-time install complete."
echo "HTTPS is not enabled here. To place Carent behind lighttpd on 443,"
echo "the existing kono-bro app must stop binding 443 directly or be moved behind lighttpd too."
