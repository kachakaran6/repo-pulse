# RepoPulse v2 (SaaS)

RepoPulse is a quiet, decision-focused repository ledger for developers. It groups your GitHub repositories by recent commit activity and helps you triage projects into **Keep going**, **Pause**, or **Retire**.

## Architecture & Security

- **Frontend:** React 18 + Vite + TypeScript with token-only CSS design system (Light & Dark themes, Schibsted Grotesk typography, tabular numbers).
- **Backend:** Node 20 + Express + TypeScript + Drizzle ORM.
- **Database:** PostgreSQL 15+ with strict Row-Level Security (RLS) on all tenant tables (`users`, `sessions`, `repos`, `repo_activity`, `repo_meta`, `settings`, `sync_runs`, `audit_log`).
- **Security:** Target OWASP ASVS Level 2 — 256-bit hashed sessions, `__Host-sid` HttpOnly cookies (7-day idle / 30-day absolute lifetime), CSRF defense, CSP / HSTS / nosniff security headers, HMAC-SHA256 constant-time webhook verification, rate limiting, and zero user token storage.

## Quick Start (Local Development)

### 1. Start Database & Backend
```bash
# In /server
npm install
npm run dev
```
*Note: If PostgreSQL is not configured in `.env`, the server automatically initializes a high-performance in-memory tenant store for instant development & test execution.*

### 2. Start Frontend Client
```bash
# In /client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Instant Demo Mode
Click **Launch Demo** on the sign-in screen to instantly explore 30+ simulated repositories across Active, Cooling, Stale, and Dead statuses with complete 90-day commit strips.

## Testing & Verification

Run the full Vitest suite (status logic, tenancy isolation, session lifecycle, CSRF & security headers, webhook HMAC verification, and data export/deletion):
```bash
cd server
npm test
```

## Docker Deployment

Run the complete production stack (Postgres 16 + Multi-stage Node runner):
```bash
docker compose up --build
```
Access the application at [http://localhost:4000](http://localhost:4000).

## Endpoints Summary

- `GET /healthz` - Health and uptime verification
- `GET /auth/github/start` - GitHub OAuth authorize flow
- `GET /auth/github/callback` - OAuth state and user token exchange
- `POST /auth/demo-login` - Instant testing sign-in
- `POST /auth/logout` - Invalidate current session
- `POST /auth/logout-all` - Sign out everywhere
- `GET /api/me` - Authenticated user profile, settings, and installation state
- `GET /api/repos` - Repositories with computed statuses & commit activity strips
- `PATCH /api/repos/:id/meta` - Update label, goal date, note, or triage decision
- `POST /api/sync` - Trigger repository synchronization (5-minute cooldown)
- `GET /api/sync/status` - Current sync job status
- `PATCH /api/settings` - Update activity status thresholds and theme
- `GET /api/export` - Download complete account data ledger (JSON)
- `DELETE /api/account` - Permanent account & tenant data cascade deletion
- `POST /webhooks/github` - GitHub App webhook receiver (HMAC verified)
