# Skills (rules the agent must follow)

## Skill 1: Token-only styling
Every color, size and radius comes from `tokens.css`. If a value is missing, add a token and document it in 03-DESIGN-SYSTEM.md first.

## Skill 2: Anti-"AI look" checklist
Reject the change if it contains:
- Gradient backgrounds or gradient text
- Identical rounded cards with the same soft shadow
- Cream + terracotta, or black + acid-green/neon
- ALL-CAPS tracked labels, middle-dot meta strings ("A · B · C"), arrows on every button
- Emoji as icons, glassmorphism, glow, fade-up animation on every section
- Hover-lift effects on every card

## Skill 3: Status logic
`statusOf(last_commit_at)`: <=7 active, <=14 cooling, <=30 stale, else dead. Null = dead. One function, one place (`server/index.js`). Test any change.

## Skill 4: Copywriting
Sentence case, active voice, user words ("repo", "label", "last commit"). Buttons say what happens: "Sync repos", "Save label". Errors: what failed + what to do.

## Skill 5: GitHub API hygiene
Use `per_page=100`, `since`, `author=<login>`. Concurrency max 5. On 403/429 stop and say when the limit resets. Never expose the token to the client.

## Skill 6: Definition of done
Runs locally, no console errors, works at 375px width, keyboard focus visible, matches design tokens.
