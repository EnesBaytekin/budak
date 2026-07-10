#!/usr/bin/env python3
"""Generate release body markdown from template."""

TEMPLATE = """## Budak {VER}

**Single binary — SQLite, embedded frontend, zero dependencies.**

### 🐧 Linux

One command for **first install** and **updates**:

```bash
V={VER}; N="budak-${{V}}-$(uname -m | sed 's/x86_64/linux-amd64/;s/aarch64/linux-arm64/')"; D="/opt/budak"; \\
sudo mkdir -p "$D" && \\
[ -f "$D/.env" ] || {{ echo "PORT=8080" | sudo tee "$D/.env" > /dev/null; echo "JWT_SECRET=$(openssl rand -base64 32)" | sudo tee -a "$D/.env" > /dev/null; echo "REGISTRATION_OPEN=true" | sudo tee -a "$D/.env" > /dev/null; }} && \\
sudo wget -q "https://github.com/EnesBaytekin/budak/releases/download/{VER}/${{N}}" -O "$D/$N" && \\
sudo chmod +x "$D/$N" && \\
if [ -f /etc/systemd/system/budak.service ]; then \\
  sudo systemctl restart budak; \\
else \\
  sudo tee /etc/systemd/system/budak.service > /dev/null << 'SVC'
[Unit]
Description=Budak
After=network.target

[Service]
Type=simple
WorkingDirectory=$D
ExecStart=$D/$N
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
  sudo systemctl daemon-reload && sudo systemctl enable --now budak; \\
fi
```

> 💡 Everything stays in `/opt/budak/` — binary, `.env`, and `budak.db`.

### 🍎 macOS

```bash
V={VER}; U=$(uname -m); [ "$U" = "arm64" ] && N="budak-${{V}}-darwin-arm64" || N="budak-${{V}}-darwin-amd64"; \\
D="$HOME/budak"; mkdir -p "$D" && cd "$D" && \\
[ -f .env ] || {{ echo "PORT=8080" > .env; echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env; echo "REGISTRATION_OPEN=true" >> .env; }} && \\
curl -sL "https://github.com/EnesBaytekin/budak/releases/download/{VER}/${{N}}" -o "$N" && \\
chmod +x "$N" && "./$N"
```

### 🪟 Windows (PowerShell)

```powershell
$v = "{VER}"; $n = "budak-${{v}}-windows-amd64.exe"; \\
if (-not (Test-Path .env)) {{ Set-Content .env "PORT=8080\nJWT_SECRET=$(openssl rand -base64 32)\nREGISTRATION_OPEN=true" }}; \\
Invoke-WebRequest -Uri "https://github.com/EnesBaytekin/budak/releases/download/$v/$n" -OutFile $n; \\
Write-Host "Done. Run: .\$n"
```

### 🔍 Check Version

```bash
/opt/budak/budak-* version
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
