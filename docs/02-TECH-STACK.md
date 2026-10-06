# Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite, plain CSS with tokens | Fast, no UI-kit look |
| Backend | Node 20 + Express | Smallest thing that works. Move to NestJS in phase 3 if modules grow |
| DB | PostgreSQL 15+ via `pg` | Relational, JSONB for the commit strip |
| GitHub | REST API v3, token auth | `/user/repos`, `/repos/{o}/{r}/commits?author=&since=` |

## Rules
- No Tailwind, no component library, no gradient or glassmorphism packages. Styling is `tokens.css` + `app.css`.
- JavaScript for POC, TypeScript from phase 2.
- Secrets only in `.env`. Never log or return the token.
- Status is computed at read time from `last_commit_at`, never stored.

## Structure
```
server/  index.js  schema.sql
client/  src/App.jsx  src/tokens.css  src/app.css
docs/    01-PRD ... 06-SKILLS
```
