#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Load .env from project root if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "==> Shutting down..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ Clean."
}
trap cleanup EXIT INT TERM

HOT="${1:-}"
PORT="${PORT:-8080}"
JWT_SECRET="${JWT_SECRET:-dev-secret-change-in-production}"

# Build frontend so embed picks it up
echo "==> Building frontend…"
cd frontend
npm run build 2>&1 | tail -1
cd ..

echo "==> Copying dist to embed…"
rm -rf backend/internal/web/dist
cp -r frontend/dist backend/internal/web/dist

echo "==> Starting backend on :${PORT}…"
cd backend
# Use Go 1.25 if available (needed by modernc.org/sqlite)
GO_CMD="go"
[ -x /tmp/go/bin/go ] && GO_CMD="/tmp/go/bin/go"
GONOSUMCHECK=* GONOSUMDB=* GOPROXY=https://proxy.golang.org,direct \
  JWT_SECRET="$JWT_SECRET" PORT="$PORT" "$GO_CMD" run ./cmd/budak &
BACKEND_PID=$!
cd ..

if [ "$HOT" = "--hot" ]; then
  echo "==> Starting Vite dev server on :5173 (hot reload)…"
  cd frontend
  npm run dev &
  FRONTEND_PID=$!
  cd ..
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  App   : http://localhost:${PORT}"
[ -n "$FRONTEND_PID" ] && echo "  Vite  : http://localhost:5173 (hot reload)"
echo "  Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

wait
