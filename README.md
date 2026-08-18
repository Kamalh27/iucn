# CRVA Portal

Base scaffold using the same core stack as the Srilanka project:
- Frontend: Next.js + TypeScript + Tailwind + MapLibre
- Backend: FastAPI + SQLAlchemy

Includes:
- Admin login with backend-managed credentials
- Logout flow
- Public full-screen map page (`/map`)
- Admin-only page (`/admin`) protected by login

## Modular Architecture

### Backend (`backend/app`)
- `api/`: thin FastAPI route handlers and request dependencies.
- `core/`: config and security primitives.
- `db/`: SQLAlchemy base/session setup.
- `models/`: domain models.
- `schemas/`: request/response contracts.
- `repositories/`: data access layer.
- `services/`: business logic layer.

### Frontend (`frontend`)
- `app/`: route-level pages only.
- `features/auth/`: auth domain module (types/api/components).
- `components/`: reusable UI/layout blocks.
- `lib/`: shared utilities (API client and auth storage).

## Routes
- `/` -> landing page
- `/map` -> public map
- `/admin/login` -> admin login
- `/admin` -> protected admin interface

## Setup

See [docs/SETUP.md](docs/SETUP.md) for full instructions:
- Local development on macOS, Windows, and Linux
- Production deployment (Ubuntu Linux, Docker-based, via `docker-compose.yml`)

## Admin Credentials
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` (local) or `.env`
(Docker deploy).
