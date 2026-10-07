# RepoPulse v3 — GitHub Repository Ledger & Triage

RepoPulse is a quiet, decision-focused repository ledger for developers. It groups your GitHub repositories by recent commit activity and helps you triage projects into **Keep going**, **Pause**, or **Retire**.

---

## 🎨 Design System & Philosophy (V3)

RepoPulse v3 uses a strictly disciplined design system built on **heat as the single chromatic hue**:
- **Active (<= 7 days):** Ember `#D2382A` (Light) / `#F2664F` (Dark) — *"Fire is burning"*
- **Cooling (<= 14 days):** Warm Ochre `#B87400` (Light) / `#F2B14C` (Dark) — *"Still warm"*
- **Stale (<= 30 days):** Slate `#4A7BA3` (Light) / `#86AED0` (Dark) — *"Cooled off"*
- **Dead (> 30 days):** Ash `#7B858D` (Light) / `#8B9399` (Dark) — *"Extinguished"*

### Interface Highlights
- **Unboxed 28px Summary Headline:** *"You committed to 8 repos this week. 7 went cold."*
- **12px Segmented Heat Bar:** Proportional distribution bar with interactive status filters.
- **Hairline Ledger Rows:** Clean 1px border list with stripped user prefixes, lock icons for private repos, and 90-day commit activity strips.
- **40px Mono Triage Interface:** Keyboard-driven triage (`[K]` Keep, `[P]` Pause, `[R]` Retire, `[Z]` Undo).
- **Inline Sentence Settings:** Fluid threshold sentence editing (`Active up to [ 7 ] days...`) with live validation.

---

## 🏗️ Architecture & Security

- **Frontend:** React 18 + Vite + TypeScript with pure tokenized CSS (`tokens.css` / `tokens-v3.css`).
- **Backend:** Node 20 + Express + TypeScript + Drizzle ORM.
- **Database:** PostgreSQL 16 with Row-Level Security (RLS) policies on all tenant tables (`users`, `sessions`, `repos`, `repo_activity`, `repo_meta`, `settings`, `sync_runs`, `audit_log`).
- **Security (OWASP ASVS Level 2):**
  - Zero long-lived GitHub user tokens stored in DB or transmitted to client.
  - 256-bit hashed session IDs with `__Host-sid` / `sid` HttpOnly, SameSite cookies.
  - Automatic session expiration: 7-day idle timeout, 30-day absolute lifetime, plus "Sign Out Everywhere" (`/auth/logout-all`).
  - Custom header CSRF verification on all mutating requests (`X-Requested-With` / `X-RepoPulse-Client`).
  - Strict Content Security Policy (CSP), HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
  - Constant-time HMAC-SHA256 GitHub App webhook signature verification (`X-Hub-Signature-256`).
  - Gated demo endpoints blocked with `403 Forbidden` in production (`NODE_ENV === 'production'`).

---

## 🚀 Quick Start (Local Development)

### 1. Database & Migrations
```bash
# 1. Start PostgreSQL
docker compose up -d db

# 2. Run migrations
npm run db:migrate
```

### 2. Start Application
```bash
# Start backend server (port 4000)
npm run dev:server

# Start Vite frontend (port 5173 with proxy to 4000)
npm run dev:client
```

### 3. Local Authentication
- **Sign in with GitHub:** Uses your registered GitHub App OAuth credentials.
- **Dev Login (Local Mode):** When `DEV_LOGIN_ENABLED=true` and `NODE_ENV !== 'production'`, click "Dev login (local mode)" on the landing page or trigger `POST /auth/dev-login`. It is strictly blocked from running in production.

---

## 🔑 GitHub App Setup (Production SaaS)

To connect live GitHub organizations and user accounts in production:

1. Create a **GitHub App** under your GitHub account or organization settings.
2. Set **Homepage URL** to `https://your-domain.com`.
3. Set **Authorization callback URL** to `https://your-domain.com/auth/github/callback`.
4. Set **Webhook URL** to `https://your-domain.com/webhooks/github`.
5. Grant repository permissions:
   - **Repository contents:** Read-only (for commit activity)
   - **Repository metadata:** Read-only
6. Subscribe to webhook events: `push`, `repository`, `installation`.
7. Generate a Private Key (`.pem`) and copy the App ID, Client ID, Client Secret, and Webhook Secret to `server/.env`.

---

## 🧪 Quality Gates & Verification

```bash
# Run server test suite (30 Vitest tests)
cd server
npm test

# Run client TypeScript typecheck
cd client
npm run typecheck

# Run client production build
npm run build
```

---

## 🐳 Docker Deployment

Run the complete multi-tenant production stack with PostgreSQL 16:
```bash
docker compose up --build
```
Access the application at [http://localhost:4000](http://localhost:4000).
