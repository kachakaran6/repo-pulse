# Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 + shadcn/ui | Modern layout primitives with RepoPulse v3 heat tokens |
| Backend | Node 20 + Express | Smallest thing that works. Move to NestJS in phase 3 if modules grow |
| DB | PostgreSQL 15+ via `pg` | Relational, JSONB for the commit strip |
| GitHub | REST API v3, token auth | `/user/repos`, `/repos/{o}/{r}/commits?author=&since=` |

## Rules
- UI styling: `src/styles/globals.css` (shadcn + heat token bridge), `src/tokens.css`, and `src/app.css` (ledger/triage utilities). No glassmorphism or decorative gradients.
- TypeScript in the client; secrets only in `.env`. Never log or return the token.
- Status is computed at read time from `last_commit_at`, never stored.

## Structure
```
server/  index.js  schema.sql
client/  src/App.tsx  src/styles/globals.css  src/tokens.css  src/app.css  src/components/ui/
docs/    01-PRD ... 06-SKILLS
```
