#!/bin/sh
set -e
node scripts/run-migrations.mjs
exec node server.js
