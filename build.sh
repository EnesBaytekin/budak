#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Building frontend…"
cd frontend
npm ci
npm run build
cd ..

echo "==> Copying frontend dist to embed…"
rm -rf backend/internal/web/dist
cp -r frontend/dist backend/internal/web/dist

echo "==> Compiling budak binary…"
cd backend
go build -o ../budak ./cmd/budak
cd ..

echo "✅ Done: $(pwd)/budak ($(ls -lh budak | awk '{print $5}'))"
echo ""
echo "   Next steps:"
echo "   1. cp .env.example .env"
echo "   2. Edit .env (DB_URL, JWT_SECRET)"
echo "   3. ./budak"
