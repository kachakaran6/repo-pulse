# RepoPulse (POC)

1. Create a DB: `createdb repopulse`
2. Server: `cd server && cp .env.example .env` (add GITHUB_TOKEN), then `npm i && npm run dev`
3. Client: `cd client && npm i && npm run dev`, then open http://localhost:5173
4. Select "Sync repos".

Token: GitHub > Settings > Developer settings > Personal access tokens. It needs read access to your repositories.
Read `docs/` first. Paste `docs/05-AI-PROMPT-LOOP.md` into any AI agent session.
