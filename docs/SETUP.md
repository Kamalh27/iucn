# Setup Guide

- [Local Development](#local-development) — macOS, Windows, Linux
- [Production Deployment](#production-deployment) — Ubuntu Linux, Docker only

## Local Development

Requirements: **Python 3.12+**, **Node.js 22+**, **git**. Steps are the same on
every OS once prerequisites are installed — only prerequisite installation
differs.

### macOS

```bash
# Prerequisites (via Homebrew: https://brew.sh)
brew install python@3.12 node git just

# Clone
git clone https://github.com/Kamalh27/iucn.git
cd iucn

# One-shot install + run (uses the Justfile)
just install
just dev
```

`just dev` starts backend on `http://localhost:8000` and frontend on
`http://localhost:3000`. Without `just`, follow the [manual steps](#manual-steps-all-os) below.

### Windows

```powershell
# Prerequisites
winget install Python.Python.3.12
winget install OpenJS.NodeJS.LTS
winget install Git.Git

# Clone
git clone https://github.com/Kamalh27/iucn.git
cd iucn
```

`just` is optional on Windows (install via `winget install Casey.Just` if
desired, run from Git Bash/WSL). Otherwise follow the
[manual steps](#manual-steps-all-os) below using PowerShell — venv activation
differs:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

### Linux (Ubuntu/Debian)

```bash
# Prerequisites
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm git
# Install just: https://github.com/casey/just#installation

# Clone
git clone https://github.com/Kamalh27/iucn.git
cd iucn

just install
just dev
```

### Manual steps (all OS)

If not using `just`:

**Backend**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

**Frontend** (new terminal)
```bash
cd frontend
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm install
npm run dev
```

The backend defaults to a local SQLite file (`backend/nbs.db`) — no database
install is required for local development. Set `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in `backend/.env` to control the seeded admin login.

Visit `http://localhost:3000` (app) and `http://localhost:8000/docs`
(API docs).

## Production Deployment

Supported target: **Ubuntu Linux (22.04/24.04 LTS) with Docker**. This is the
only supported production path — the stack runs as three containers (Postgres
+ PostGIS, backend, frontend) via `docker-compose.yml` at the repo root.

### 1. Install Docker Engine + Compose plugin

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker without sudo (log out/in after this)
sudo usermod -aG docker $USER
```

Verify: `docker --version && docker compose version`

### 2. Clone the repo and configure environment

```bash
git clone https://github.com/Kamalh27/iucn.git
cd iucn
cp .env.example .env
```

Edit `.env` and set real values — **do not deploy with the example
defaults**:

```
POSTGRES_USER=nbs
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=nbs

APP_SECRET=<strong-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=120
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<strong-admin-password>

NEXT_PUBLIC_API_URL=http://<server-ip-or-domain>:8000
```

Generate strong secrets with, e.g. `openssl rand -hex 32`.

### 3. Build and start

```bash
docker compose up -d --build
```

This starts:
- `db` — `postgis/postgis:latest`, data persisted in the `postgres_data` volume
- `backend` — FastAPI on port `8000`
- `frontend` — Next.js on port `3000`

### 4. Open firewall ports (if `ufw` is enabled)

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
```

Put a reverse proxy (e.g. nginx or Caddy) with TLS in front of ports 3000/8000
for a public deployment; this is not included in the compose file.

### 5. Verify

```bash
docker compose ps
docker compose logs -f backend
curl http://localhost:8000/health
```

Visit `http://<server-ip>:3000`.

### Common operations

```bash
# View logs
docker compose logs -f [service]

# Restart after pulling new code
git pull
docker compose up -d --build

# Stop the stack (keeps data volume)
docker compose down

# Stop and wipe the database volume (destructive)
docker compose down -v
```
