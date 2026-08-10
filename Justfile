set shell := ["bash", "-cu"]

default:
    @just --list

# Backend
venv:
    @if [ ! -x backend/.venv/bin/python ]; then \
      python3 -m venv backend/.venv; \
    fi
    backend/.venv/bin/pip install --upgrade pip

backend-install: venv
    backend/.venv/bin/pip install -r backend/requirements.txt

backend-dev:
    cd backend && set -a && [ -f .env ] && source .env || true && set +a && .venv/bin/uvicorn app.main:app --reload

backend-run:
    cd backend && .venv/bin/uvicorn app.main:app

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
    @(cd backend && set -a && [ -f .env ] && source .env || true && set +a && .venv/bin/uvicorn app.main:app --reload) & \
    (cd frontend && set -a && [ -f .env.local ] && source .env.local || true && set +a && npm run dev) & \
    wait

# Setup
install: backend-install frontend-install
