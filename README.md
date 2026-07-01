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

1. Copy the example env file:
   ```bash
   cp release/.env.example .env
   ```
2. Edit `.env` with your settings (domain, passwords, etc.)
3. Optionally place your TLS certificates in `./certs/`
4. Start the services:
   ```bash
   docker compose up -d
   ```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USER` | `budak` | Database user |
| `DB_PASSWORD` | — | Database password (required) |
| `DB_NAME` | `budak` | Database name |
| `JWT_SECRET` | — | JWT signing secret (required) |
| `REGISTRATION_OPEN` | `true` | Allow new user registration |
| `DOMAIN` | `localhost` | Domain for Caddy/Let's Encrypt |
| `BUDAK_VERSION` | `latest` | Docker image tag |
| `BUDAK_CERTS_DIR` | `./certs` | Host path for TLS certificates |

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
