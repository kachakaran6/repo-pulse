# GitPulse — Repository Activity & Project Clarity

GitPulse helps developers understand which repositories are active, quiet, paused, or potentially abandoned. It combines GitHub activity signals with user-defined project labels and review decisions.

## Included
- `PRD.md` — product requirements and MVP acceptance criteria
- `TECH_STACK.md` — architecture, stack, security, data model, API outline
- `DESIGN_SYSTEM.md` — fixed visual rules and reusable UI patterns
- `IMPLEMENTATION_PHASES.md` — implementation sequence and definition of done
- `AI_BUILD_PROMPT.md` — end-to-end loop-engineering prompt
- `.agents/skills/` — focused implementation skills for the coding agent

## Product principle
**Quiet does not automatically mean dead.** GitPulse reports observable activity and lets the user classify a project. A repository with no commits may still be in planning, maintenance, or intentionally paused.

## Suggested repository layout
```text
gitpulse/
  apps/
    web/                 # React + Vite
    api/                 # NestJS REST API
  packages/
    shared/              # shared types / schemas
  docs/
    PRD.md
    TECH_STACK.md
    DESIGN_SYSTEM.md
    IMPLEMENTATION_PHASES.md
    AI_BUILD_PROMPT.md
  .agents/
    skills/
  docker-compose.yml
  .env.example
```

## Local development
Follow `TECH_STACK.md` for prerequisites and commands. Never commit real OAuth secrets, GitHub tokens, database credentials, or production `.env` files.
