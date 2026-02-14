# VidAI Full System Validation Guide

This document describes how to validate the entire VidAI system before deployment: authentication, registration, database, backend, frontend, and AI service integration.

## Quick validation (automated)

From the repo root, run:

```bash
npm run validate
```

This checks server env, backend health, AI service health, auth route, frontend build, and lint. For full checks, start backend and AI service first (see below).

1. **Start the backend** (requires MongoDB and `server/.env`):
   ```bash
   cd server
   node server.js
   ```

2. **Start the AI service** (use the venv inside `ai-service` — it has FastAPI/uvicorn):
   ```bash
   cd ai-service
   .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   No need to “activate” — this uses the venv’s Python directly.  
   If your `ai-service\.venv\Scripts` has no `activate` script, use this command; it works the same.

   **If port 8000 is already in use** (e.g. `[Errno 10048] only one usage of each socket address...`):
   - Find what is using it (PowerShell): `Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object OwningProcess; Get-Process -Id <PID>`
   - Or use another port: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8001`  
     Then set `AI_SERVICE_URL=http://localhost:8001` in `server/.env` so the backend can reach the AI service.

3. **Run the validation script** (from repo root):
   ```bash
   node scripts/validate.js
   ```
   This checks: server env vars, backend health, AI service health, auth route validation, frontend build, and frontend lint.

## What was validated

### Authentication & registration
- **Sign up**: `POST /api/v1/auth/register` — validated (name, email, password, role); admin role cannot be self-registered; password rules (8+ chars, upper, lower, number) enforced on backend and aligned on frontend (AuthModal).
- **Sign in**: `POST /api/v1/auth/login` — validated; returns access + refresh tokens; inactive users blocked.
- **Refresh token**: Uses separate `JWT_REFRESH_SECRET`; type claim prevents access token reuse; DB revocation supported.
- **Protected routes**: `protect` and `authorize(role)` middleware; frontend `ProtectedRoute` and `AuthContext` with token refresh on 401.

### Database
- MongoDB via Mongoose; connection in `server/src/config/database.js`; `MONGODB_URI` required in `server/.env`.

### Backend
- **Security**: Helmet, CORS, rate limiting (global + stricter on `/api/v1/auth`), mongo-sanitize, HPP, compression; Stripe webhook uses raw body for signature verification.
- **Routes**: auth, vendors, bookings, budget, admin, upload, payments, AI proxy. All protected routes use JWT + RBAC where applicable.

### Frontend
- **API client**: `src/api/client.js` — base URL from `VITE_API_URL` or `http://localhost:5000/api/v1`; Bearer token and 401 refresh flow.
- **Auth**: `AuthContext` persists tokens and user; login/register/logout and role-based redirects.
- **Routing**: Public (/, /vendor-landing, /admin), user (/dashboard, /bookings, /budget, /chat, /vendors), vendor (/vendor/*), admin (/admin/dashboard, ...).

### AI service (Python, use .venv)
- FastAPI; CORS configured; endpoints: `/api/v1/chat`, `/api/v1/recommendations`, `/api/v1/budget-plan`; health at `/health`. Backend proxies `/api/v1/ai/*` to this service.

### Security notes
- Passwords hashed with bcrypt (salt 12).
- JWT access and refresh use different secrets and type claims.
- Admin role cannot be registered via API.
- Input validation and sanitization (validator, mongo-sanitize) in place.
- No secrets in frontend; tokens in localStorage (consider httpOnly cookies for production).

## Manual smoke test

1. Open frontend (e.g. `npm run dev` → Vite may use port 3000 per vite.config.js).
2. Sign up with a new user (email + password meeting rules).
3. Sign out, then sign in again.
4. Visit /dashboard, /budget, /chat (user flows).
5. As admin (create admin in DB or seed): /admin → login → /admin/dashboard, /admin/users, /admin/system.

## Environment summary

| Component   | Env file           | Key variables                                      |
|------------|--------------------|----------------------------------------------------|
| Backend    | `server/.env`      | MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, etc. |
| Frontend   | `.env` (optional)  | VITE_API_URL (e.g. `/api/v1` when using Vite proxy) |
| AI service | `ai-service/.env`  | PORT, OLLAMA_BASE_URL, OLLAMA_MODEL, CORS_ORIGINS  |
