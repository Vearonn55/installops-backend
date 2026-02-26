#!/usr/bin/env bash
# Single-command setup: install deps, ensure .env, initialize DB + one admin user + up to 4 stores.
# Run from backend/ (git root): ./setup.sh
# Then start the app: npm start

set -e
cd "$(dirname "$0")"

echo "InstallOps — setup"
echo ""

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example."
  else
    echo "No .env or .env.example found."
    exit 1
  fi
fi

node scripts/ensure-env.js
npm install
node scripts/init.js

echo ""
echo "Setup complete. Start the app with: npm start"
