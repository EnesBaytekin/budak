# Budak

A tree-based todo application with mind map visualization.

**Single binary — no Docker, no database server, no dependencies.**

## Quick Start

```bash
cp .env.example .env
JWT_SECRET=$(openssl rand -base64 32) ./budak-linux-amd64
```

Open **http://localhost:8080**

## Configuration

Place `.env` next to the binary:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port |
| `DB_PATH` | `budak.db` | SQLite database file path |
| `JWT_SECRET` | — | JWT signing secret (required) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry |
| `REGISTRATION_OPEN` | `true` | Allow new user registration |
| `WHITELIST_ENABLED` | `false` | Restrict registration to whitelisted usernames |
| `WHITELIST_FILE` | `whitelist.txt` | Path to whitelist file |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

## Build from source

```bash
./build.sh
# Produces ./budak (single binary, frontend embedded)
```

## Development

```bash
# Everything on :8080 — auto-builds frontend, no Vite needed
./dev.sh

# With Vite hot reload on :5173 (for frontend work)
./dev.sh --hot
```

Opens **http://localhost:8080** (or **http://localhost:5173** with `--hot`).

> `Ctrl+C` stops everything. No build artifacts remain.

## Release Process

```bash
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions builds binaries for all platforms and creates a release.

## License

MIT
