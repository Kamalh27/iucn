set shell := ["bash", "-cu"]

default:
    @just --list

# Backend
venv:
    @if [ ! -x backend/.venv/bin/python ] || ! backend/.venv/bin/python --version >/dev/null 2>&1; then \
      rm -rf backend/.venv; \
      python3 -m venv backend/.venv; \
    fi
    backend/.venv/bin/pip install --upgrade pip

backend-install: venv
    backend/.venv/bin/pip install -r backend/requirements.txt

backend-migrate: backend-install
    cd backend && .venv/bin/alembic upgrade head

backend-dev:
    cd backend && set -a && [ -f .env ] && source .env || true && set +a && .venv/bin/alembic upgrade head && .venv/bin/uvicorn app.main:app --reload

backend-run:
    cd backend && .venv/bin/alembic upgrade head && .venv/bin/uvicorn app.main:app

# Local TiTiler for COG raster tiles (no Docker required)
titiler-install:
    backend/.venv/bin/pip install "titiler.application>=0.23,<1"

tile: titiler-install
    cd backend && set -a && [ -f .env ] && source .env || true && set +a && TITILER_URL=http://localhost:8001 .venv/bin/uvicorn titiler.application.main:app --host 127.0.0.1 --port 8001 --reload

titiler: tile

# Frontend
frontend-install:
    cd frontend && npm ci

frontend-dev:
    cd frontend && set -a && [ -f .env.local ] && source .env.local || true && set +a && npm run dev

frontend-build:
    cd frontend && npm run build

frontend-lint:
    cd frontend && npm run lint

# Local app development
dev-setup: backend-install
    @if [ ! -d frontend/node_modules ]; then \
      just frontend-install; \
    else \
      echo "Frontend dependencies already installed, skipping install."; \
    fi

dev: dev-setup
    @echo "Starting backend on http://localhost:8000 and frontend on http://localhost:3000"
    @(cd backend && set -a && [ -f .env ] && source .env || true && set +a && .venv/bin/alembic upgrade head && .venv/bin/uvicorn app.main:app --reload) & \
    (cd frontend && set -a && [ -f .env.local ] && source .env.local || true && set +a && npm run dev) & \
    wait

# Setup
install: backend-install frontend-install

# Full geospatial stack (PostGIS + backend + frontend + TiTiler)
compose-up:
    @test -f .env || (echo "Missing .env. Run: cp .env.example .env and set required values." && exit 1)
    docker compose up -d --build

compose-down:
    docker compose down

compose-restart:
    docker compose up -d --build

compose-ps:
    docker compose ps

compose-logs service="":
    docker compose logs -f {{service}}

compose-shell service="backend":
    docker compose exec {{service}} sh
