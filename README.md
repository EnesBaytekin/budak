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

# 2. Copy the Caddyfile (required for reverse proxy)
cp release/Caddyfile .

# 3. Edit .env with your domain and secrets
#    (DOMAIN, JWT_SECRET, DB_PASSWORD are required)
vim .env

# 4. Start all services
docker compose up -d
```

Your app will be available at **https://your-domain.com** — Caddy auto-provisions a Let's Encrypt certificate.

---

### HTTPS Options

Budak supports two approaches for HTTPS termination. **Caddy** is the default; **Cloudflare Tunnel** is an optional alternative.

#### Option A: Caddy with Let's Encrypt (Default)

Set your domain in `.env` and Caddy automatically provisions a free SSL certificate:

```env
DOMAIN=budak.example.com
```

No additional setup needed. Caddy handles HTTP-01 challenges on ports 80/443.

#### Option B: Caddy with Custom TLS Certificates

Place your certificate and key files in a directory (default `./certs/`) and configure:

```env
DOMAIN=budak.example.com
BUDAK_CERTS_DIR=./certs
TLS_CERT_PATH=/certs/cert.pem
TLS_KEY_PATH=/certs/key.pem
```

Caddy will use your certs instead of provisioning via Let's Encrypt.

#### Option C: Cloudflare Tunnel (Alternative)

Use Cloudflare Tunnel if you prefer not to open ports 80/443, or want to tunnel through Cloudflare's network.

1. Create a tunnel in Cloudflare Zero Trust dashboard and note the token
2. Set the token in `.env`:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here
   ```
3. Uncomment the `tunnel` service in `docker-compose.yml`
4. (Optional) Remove or comment out Caddy's `ports:` block to close 80/443
5. Start the services:
   ```bash
   docker compose up -d
   ```

> **Note:** When using Cloudflare Tunnel, you don't need to set `DOMAIN` for TLS — the tunnel handles encryption. Caddy still runs as an internal reverse proxy.

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
1. Build and push Docker images to Docker Hub
2. Create a GitHub Release with compose files and env example

## License

MIT
