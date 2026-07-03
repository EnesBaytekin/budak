# Budak

A tree-based todo application with mind map visualization.

## Features

- **Hierarchical Todos** — Create nested todo trees with unlimited depth
- **Tree View** — Classic expandable/collapsible tree interface
- **Mind Map View** — Infinite canvas with draggable nodes (React Flow)
- **Multiple Trees** — Organize your todos into separate trees/projects
- **User Accounts** — Each user has their own private todos
- **Responsive** — Works on desktop and mobile browsers
- **HTTPS** — Secure access via Caddy reverse proxy (Let's Encrypt or custom certs)

## Quick Start (Development)

```bash
# Clone the repo
git clone https://github.com/enesbaytekin/budak.git
cd budak

# Start all services
docker compose -f docker-compose.dev.yml up -d

# Access at http://localhost:5173
```

## Production Deployment

### Quick Start

```bash
# 1. Copy the example env file
cp release/.env.example .env

# 2. Edit .env with your domain and secrets
#    (DOMAIN, JWT_SECRET, DB_PASSWORD are required)
vim .env

# 3. Start all services
docker compose up -d
```

Your app will be available at **https://your-domain.com** — Caddy auto-provisions a Let's Encrypt certificate.

---

### HTTPS Options

Budak supports two approaches. **Both use the same Caddyfile** — no changes needed.

#### Option A: Direct HTTPS with Let's Encrypt (Default)

Set your domain in `.env`:

```env
DOMAIN=budak.example.com
```

Caddy automatically provisions a free SSL certificate on ports 80/443.

#### Option B: Cloudflare Tunnel

Use this if you prefer not to open ports 80/443, or already have services using them.

1. Create a tunnel in [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) and note the token
2. In your `.env`:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here
   ```
3. In `docker-compose.yml`:
   - **Uncomment** the `tunnel` service block
   - **Comment out** Caddy's `ports:` block (host 80/443 not needed)
4. In Cloudflare dashboard, set your tunnel's **Public Hostname** service to `http://caddy:80`
5. Start the services:
   ```bash
   docker compose up -d
   ```

> **How it works:** Cloudflare handles HTTPS for you. The tunnel forwards traffic to Caddy via HTTP internally. Caddy doesn't need TLS config — it just routes requests to the right service.

#### Custom TLS Certificates

Place your certificates in `./certs/` and set in `.env`:

```env
BUDAK_CERTS_DIR=./certs
TLS_CERT_PATH=/certs/cert.pem
TLS_KEY_PATH=/certs/key.pem
```

---

### Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USER` | `budak` | Database user |
| `DB_PASSWORD` | — | Database password (required) |
| `DB_NAME` | `budak` | Database name |
| `JWT_SECRET` | — | JWT signing secret (required, use `openssl rand -base64 32`) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry duration |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry duration |
| `REGISTRATION_OPEN` | `true` | Allow new user registration |
| `DOMAIN` | — | Domain for Caddy/Let's Encrypt (required for HTTPS) |
| `BUDAK_VERSION` | `latest` | Docker image tag |
| `BUDAK_CERTS_DIR` | `./certs` | Host path for TLS certificates |
| `TLS_CERT_PATH` | — | Custom TLS certificate path (inside container) |
| `TLS_KEY_PATH` | — | Custom TLS key path (inside container) |
| `CLOUDFLARE_TUNNEL_TOKEN` | — | Cloudflare Tunnel token (alternative to direct HTTPS) |
| `WHITELIST_ENABLED` | `false` | Restrict registration to specific usernames |
| `WHITELIST_FILE` | `whitelist.txt` | Path to whitelist file (one username per line) |

### Files Layout

```
.
├── docker-compose.yml       # Production services
├── .env                     # Your configuration (excluded from git)
├── Caddyfile                # Caddy reverse proxy config
├── certs/                   # Custom TLS certificates (optional)
│   ├── cert.pem
│   └── key.pem
├── whitelist.txt            # Optional registration whitelist
└── release/                 # Standalone release bundle
    ├── docker-compose.yml
    └── .env.example
```

> **Tip:** When deploying from a release, download all assets (`docker-compose.yml`, `.env.example`, `Caddyfile`, `whitelist.txt`) to the same directory.

## Architecture

```
┌─────────┐    ┌──────────┐    ┌──────────┐
│ Caddy   │───▶│ Frontend │    │ Backend  │
│ (TLS)   │    │ (Nginx)  │    │ (Go)     │
└─────────┘    └──────────┘    └────┬─────┘
                                    │
                              ┌─────▼─────┐
                              │ PostgreSQL│
                              └───────────┘
```

- **Backend**: Go with chi router, pgx driver, JWT auth
- **Frontend**: React 18 + TypeScript + Tailwind CSS + React Flow
- **Database**: PostgreSQL 16
- **Proxy**: Caddy (TLS termination, Let's Encrypt or custom certs)

## Development

```bash
# Backend (standalone)
cd backend
DB_URL=postgres://budak:budak@localhost:5432/budak go run ./cmd/budak

# Frontend (standalone)
cd frontend
npm run dev

# Full stack
docker compose -f docker-compose.dev.yml up -d
```

## Release Process

Tags trigger automatic builds and releases:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will:
1. Build and push Docker images to Docker Hub (amd64 + arm64)
2. Create a GitHub Release with compose files, env example, and whitelist.txt

## License

MIT
