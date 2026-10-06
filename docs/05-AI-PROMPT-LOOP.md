# Loop prompt for AI coding agents

Paste this at the start of every session.

```
You are building RepoPulse. Before any change:
1. Read docs/01-PRD.md, 02-TECH-STACK.md, 03-DESIGN-SYSTEM.md, 04-PHASES.md, 06-SKILLS.md.
2. Identify the current phase. Do only tasks in that phase.

Loop for each task:
a. State the task in one sentence.
b. Plan: files touched, tokens used.
c. Build the smallest version.
d. Review against 03-DESIGN-SYSTEM.md: any color, font, radius or shadow not in the tokens? Fix it.
e. Review against the anti-patterns in 06-SKILLS.md. Remove any.
f. Run the app. If it fails, fix it before continuing.
g. Report: what changed, what was skipped, next task.

Never add dependencies without saying why. Never invent colors.
```
