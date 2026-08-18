# Testing Guide

This project has four layers of automated testing on both the backend and
the frontend: **unit**, **integration** (backend) / **component** (frontend),
**end-to-end** (frontend, against a running app), and **security**.

## Backend (`backend/tests`)

Run with `just backend-test` (add `-security` for the SAST/dependency scan).

```
backend/tests/
  conftest.py          # shared fixtures: SQLite test DB, TestClient, user/token factories
  unit/                # no HTTP, no I/O beyond an in-memory DB session
  integration/          # exercises the FastAPI app end-to-end over HTTP
  security/              # authn/authz boundary checks, injection attempts, data-exposure checks
```

**Why SQLite for a Postgres/PostGIS app?** `Settings.__post_init__` refuses a
`sqlite://` `DATABASE_URL` for the *running app*, but none of the ORM models
(`User`, `ApiKey`, `Translation`, `Document`, `GeoLayer`) declare PostGIS
geometry columns -- only the raw-SQL vector-tile ingestion path in
`GeoLayerService.upload_vector` touches `geometry(...)` columns directly.
That means every endpoint except vector-layer upload/tile/data can be
exercised fully in-memory. `tests/conftest.py` overrides the `get_db`
dependency with a SQLite session and never triggers the app's `on_startup`
handler (which opens a session against the real `settings.database_url`),
so the suite needs no external services and runs in ~3 seconds.

Vector ingestion itself (`upload_vector`, `/geo-layers/{id}/tiles/*.pbf`,
`/geo-layers/{id}/data`) needs real PostGIS and is not covered by HTTP
integration tests here; `_safe_identifier`, `_validate_title`, and
`_validate_location_tag` -- the parts of that path that don't require a
database -- are unit-tested directly.

- **unit**: password hashing/verification, HMAC-signed token issuance +
  tampering/expiry/revocation, location-tag validation, SQL-identifier
  allow-listing, API-key/translation service logic, `ensure_default_admin`
  bootstrap behavior.
- **integration**: every `/auth`, `/admin/*`, and public `/layers*` route --
  success paths, 401/403/404/409/422 error paths, and admin-only guards.
- **security**: missing/malformed/expired/tampered/revoked bearer tokens,
  role-escalation attempts, SQL-injection payloads through the login and
  geo-layer-upload fields, and assertions that password hashes and API-key
  secrets never appear in any response body.

## Frontend (`frontend/tests`, `frontend/e2e`)

Run with `just frontend-test` (unit + component, Vitest + Testing Library)
and `just frontend-test-e2e` (Playwright, boots the real Next.js dev server
and stubs backend calls with `page.route()`).

```
frontend/
  tests/unit/        # lib/, features/*/api.ts -- pure functions and fetch wrappers
  tests/component/   # React components via @testing-library/react
  e2e/               # Playwright specs against a real running app
```

Playwright tests mock the backend at the network layer rather than requiring
a live FastAPI server, so `just frontend-test-e2e` has no backend
dependency. Route patterns are scoped to the backend's absolute origin
(`http://localhost:8000/...`) where the path could otherwise collide with a
frontend page route of the same name (e.g. `/admin`).

## Security scanning

| Tool | Layer | What it catches |
|---|---|---|
| `bandit` | backend static analysis | common Python security anti-patterns (the raw-SQL f-strings in `geo_layer_service.py`/`admin.py` are flagged and annotated in `pyproject.toml` -- they're guarded by `_safe_identifier()`, see `tests/unit/test_geo_layer_service_unit.py`) |
| `pip-audit` | backend dependencies | known CVEs in installed packages |
| `npm audit` | frontend dependencies | known CVEs in installed packages |
| `tests/security/*` | backend, runtime | authn/authz bypass, injection, data exposure |

## Issues found while building this suite (fixed)

These were found incidentally while adding tests, and have since been fixed:

1. **`backend/requirements.txt` was unresolvable as written.**
   `titiler.application>=0.23,<1` requires `rio-cogeo>=5.0,<6.0` at every
   0.x release, but the file also pinned `rio-cogeo>=7.0.2,<8` -- an
   unsatisfiable combination (`pip install -r requirements.txt` failed with
   "resolution-too-deep"). Fixed by capping `rio-cogeo` at `>=5.4,<6`, which
   is what `titiler.application`'s 0.x line actually needs; `rio_cogeo`'s
   `cog_translate`/`cog_profiles` API used in `geo_layer_service.py` is
   unchanged across 5.x-7.x. Verified: `pip install -r requirements.txt`
   resolves and installs cleanly, `app.main` and
   `titiler.application.main:app` (the `just tile` entrypoint) both still
   import successfully, and the full test suite still passes.
2. **`pyarrow==22.0.0` (satisfied the old `<23` pin) had a known
   vulnerability**, PYSEC-2026-113, fixed in `23.0.1`. Fixed by bumping the
   pin to `pyarrow>=23.0.1,<24`. Verified: `pip-audit` now reports no known
   vulnerabilities.
3. **`AuthService.ensure_default_admin()` crashed if the bootstrap admin
   email belonged to a deactivated account.** It looked the account up with
   `get_active_by_email()`, which filters out inactive users, then tried to
   `INSERT` a new row with the same (unique) email and hit an integrity
   error instead of reactivating the account. Fixed by looking it up with
   `get_by_email()` (no active-only filter) so an inactive match gets
   promoted/reactivated instead. Verified by
   `tests/unit/test_auth_service.py::test_reactivates_existing_but_deactivated_admin_email`,
   which now passes (it was an `xfail` documenting the crash before this fix).
