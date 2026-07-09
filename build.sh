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
GO_CMD="go"
[ -x /tmp/go/bin/go ] && GO_CMD="/tmp/go/bin/go"
VERSION=$(git describe --tags 2>/dev/null || echo "dev")
GONOSUMCHECK=* GONOSUMDB=* GOPROXY=https://proxy.golang.org,direct \
  "$GO_CMD" build -ldflags="-X 'main.Version=$VERSION'" -o ../budak ./cmd/budak
cd ..

echo "✅ Done: $(pwd)/budak ($(ls -lh budak | awk '{print $5}'))"
