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

## Testing

Backend and frontend each have unit, integration/component, security, and
(frontend) end-to-end test suites, runnable individually or all together:

```
just backend-test           # pytest: unit + integration, coverage + junit report
just backend-test-security  # bandit (SAST) + pip-audit (dependency CVEs)
just frontend-test          # vitest: unit + component, coverage report
just frontend-test-e2e      # Playwright end-to-end (installs Chromium)
just frontend-test-security # npm audit (production dependencies)

just test                   # backend-test + frontend-test (fast feedback loop)
just test-all                # everything above
```

Reports land in `backend/htmlcov/` + `backend/report.xml` and
`frontend/coverage/` + `frontend/playwright-report/`. CI (`.github/workflows/tests.yml`)
runs the full matrix on every push/PR and uploads all reports as build artifacts.

See [docs/TESTING.md](docs/TESTING.md) for what each layer covers and how the
test databases are provisioned.
