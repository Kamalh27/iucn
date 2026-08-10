# NBS Base Scaffold

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

## Quick start

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend expects backend at `http://localhost:8000` by default.

## Admin Credentials
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`.
# iucn
