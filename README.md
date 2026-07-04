# Budak

A tree-based todo application with mind map visualization.

**Single binary — no Docker, no reverse proxy, no dependencies.**

## Quick Start

```bash
# 1. Download the binary for your platform from Releases
# 2. Download .env.example
# 3. Run:
cp .env.example .env
# Edit .env (set DB_URL and JWT_SECRET)
./budak-linux-amd64
```

Open **http://localhost:8080** in your browser.

## Configuration

Place `.env` next to the binary:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | — | PostgreSQL connection string (required) |
| `JWT_SECRET` | — | JWT signing secret (required) |
| `PORT` | `8080` | HTTP port to listen on |
| `REGISTRATION_OPEN` | `true` | Allow new user registration |
| `WHITELIST_ENABLED` | `false` | Restrict registration to whitelisted usernames |

## Deployment

Budak is a single Go binary with the frontend embedded. Everything runs on one port.

### With Cloudflare Tunnel (optional)

```bash
# Just run the binary, then point your tunnel to localhost:8080
./budak

# In Cloudflare dashboard: tunnel → Public Hostname → http://localhost:8080
```

### With a reverse proxy (optional)

```bash
# Put nginx/Caddy/Apache in front of :8080, add TLS there
./budak
```

## Development

```bash
# Frontend + backend (hot reload)
cd frontend
npm run dev       # → :5173 with API proxy to :8080
cd ../backend
DB_URL="postgres://budak:budak@localhost:5432/budak" go run ./cmd/budak

# Or build both:
./build.sh
```

## Build from source

```bash
./build.sh
# Produces ./budak (single binary)
```

## Architecture

```
┌──────────┐     ┌──────────┐
│  Binary  │────▶│PostgreSQL│
│ :8080    │     └──────────┘
│  API +   │
│  SPA     │
└──────────┘
```

- **Backend**: Go + chi router + pgx driver + JWT auth
- **Frontend**: React 18 + TypeScript + Tailwind CSS + React Flow **(embedded)**
- **Database**: PostgreSQL 16

## Release Process

```bash
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions builds binaries for all platforms and creates a release.

## License

MIT
