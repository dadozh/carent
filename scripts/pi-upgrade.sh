#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/carent}"

echo "Upgrading Carent in ${APP_DIR}"

if [ ! -f "${APP_DIR}/package.json" ]; then
  echo "Missing ${APP_DIR}/package.json" >&2
  exit 1
fi

if [ ! -f "${APP_DIR}/.env.production" ]; then
  echo "Missing ${APP_DIR}/.env.production" >&2
  exit 1
fi

cd "${APP_DIR}"

echo "Installing dependencies"
npm ci

echo "Building application"
npm run build

echo "Reloading PM2 process"
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "Upgrade complete"
