#!/usr/bin/env python3
"""Generate release body markdown from template."""

TEMPLATE = r"""## Budak {VER}

**Single binary — SQLite, embedded frontend, zero dependencies.**

### 🐧 Linux

One command for **first install** and **updates**:

```bash
V={VER}; N="budak-${V}-$(uname -m | sed 's/x86_64/linux-amd64/;s/aarch64/linux-arm64/')"; D="/opt/budak"; \
sudo mkdir -p "$D" && \
[ -f "$D/.env" ] || (echo "PORT=8080" | sudo tee "$D/.env" > /dev/null && echo "JWT_SECRET=$(openssl rand -base64 32)" | sudo tee -a "$D/.env" > /dev/null && echo "REGISTRATION_OPEN=true" | sudo tee -a "$D/.env" > /dev/null) && \
sudo wget -q "https://github.com/EnesBaytekin/budak/releases/download/{VER}/${N}" -O "$D/.budak.tmp" && \
sudo mv "$D/.budak.tmp" "$D/budak" && \
sudo chmod +x "$D/budak" && \
if [ -f /etc/systemd/system/budak.service ]; then sudo systemctl restart budak; else \
printf '[Unit]\nDescription=Budak\nAfter=network.target\n\n[Service]\nType=simple\nWorkingDirectory=%s\nExecStart=%s/budak\nRestart=always\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target\n' "$D" "$D" | sudo tee /etc/systemd/system/budak.service > /dev/null && \
sudo systemctl daemon-reload && sudo systemctl enable --now budak; fi
```

> Everything lives in `/opt/budak/budak`, `.env`, and `budak.db`.
> On update: same command — binary is replaced, service restarted.

### 🍎 macOS

```bash
V={VER}; U=$(uname -m); [ "$U" = "arm64" ] && N="budak-${V}-darwin-arm64" || N="budak-${V}-darwin-amd64"; \
D="$HOME/budak"; mkdir -p "$D" && \
[ -f "$D/.env" ] || (echo "PORT=8080" > "$D/.env" && echo "JWT_SECRET=$(openssl rand -base64 32)" >> "$D/.env" && echo "REGISTRATION_OPEN=true" >> "$D/.env") && \
curl -sL "https://github.com/EnesBaytekin/budak/releases/download/{VER}/${N}" -o "$D/.budak.tmp" && \
mv "$D/.budak.tmp" "$D/budak" && \
chmod +x "$D/budak" && "./$D/budak"
```

### 🪟 Windows (PowerShell)

```powershell
$v = "{VER}"; $n = "budak-${v}-windows-amd64.exe"; \
$d = "$env:USERPROFILE\budak"; New-Item -Force -ItemType Directory -Path $d | Out-Null; \
if (-not (Test-Path "$d\.env")) { Set-Content "$d\.env" "PORT=8080\nJWT_SECRET=$(openssl rand -base64 32)\nREGISTRATION_OPEN=true" }; \
Invoke-WebRequest -Uri "https://github.com/EnesBaytekin/budak/releases/download/$v/$n" -OutFile "$d\budak.exe"; \
Write-Host "Done. Run: $d\budak.exe"
```

### Check Version

```bash
/opt/budak/budak version
```
"""

import sys

if len(sys.argv) < 3:
    print("Usage: gen-release-body.py <version> <outfile>")
    sys.exit(1)

version = sys.argv[1]
out = sys.argv[2]

with open(out, 'w') as f:
    f.write(TEMPLATE.replace("{VER}", version))
