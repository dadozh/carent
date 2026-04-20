#!/usr/bin/env bash
set -euo pipefail

PACKAGE_ROOT="${PACKAGE_ROOT:-dist/pi-package}"
PACKAGE_NAME="${PACKAGE_NAME:-carent-pi-deploy}"
ARCHIVE_PATH="${ARCHIVE_PATH:-dist/${PACKAGE_NAME}.tar.gz}"

rm -rf "${PACKAGE_ROOT}"
mkdir -p "${PACKAGE_ROOT}"

rsync -az \
  --delete \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude ".data" \
  --exclude ".env.local" \
  --exclude ".env.production" \
  --exclude "dist" \
  ./ "${PACKAGE_ROOT}/"

mkdir -p "$(dirname "${ARCHIVE_PATH}")"
tar -czf "${ARCHIVE_PATH}" -C "$(dirname "${PACKAGE_ROOT}")" "$(basename "${PACKAGE_ROOT}")"

echo "Created deployment package:"
echo "  ${ARCHIVE_PATH}"
echo "Copy it to the Pi, extract it, then run:"
echo "  bash scripts/pi-install.sh"
