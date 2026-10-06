# Git Workflow, Versioning, Commits, Pushes, and First Coolify Deployment

This document is mandatory for every coding agent working on GitPulse. Follow it alongside `AI_BUILD_PROMPT.md` and `IMPLEMENTATION_PHASES.md`.

## 1. Non-negotiable rules

- Work in small, reviewable changes. Do not make one giant commit for an entire phase.
- Never destroy or overwrite user work. Never run `git reset --hard`, `git clean -fd`, force-push, or history-rewriting commands unless the user explicitly requests it and the exact consequences have been reviewed.
- Never commit secrets, `.env` files, OAuth credentials, API tokens, private keys, database passwords, or production dumps.
- Never print API tokens in terminal output, logs, tool results, commits, deployment logs, or chat messages.
- Do not push broken code merely to keep the branch updated. Run the relevant quality gates first.
- Do not claim a commit, push, deployment, or health check succeeded until its command/API response confirms it.
- Inspect `git status` before every commit and before any potentially destructive action.
- Preserve unrelated pre-existing changes. Stage explicit file paths rather than blindly staging everything when the worktree contains unrelated changes.
- Never assume a repository, branch, remote, Coolify project, application, server, or API endpoint exists. Discover and verify it first.
- Do not expose secrets in a generated `.env.example`; use placeholders only.

## 2. Initial repository inspection

At the beginning of work, inspect:

```bash
git status --short --branch
git branch --show-current
git remote -v
git log -5 --oneline --decorate
git tag --list --sort=-version:refname | head -10
```

Then inspect the repository tree, package scripts, lockfiles, tests, and deployment configuration.

If the directory is not a Git repository, stop and report that fact. Do not initialize a repository or create a remote without checking with the user or verifying the requested destination. If no remote exists, finish local work and ask for the intended Git host/repository rather than inventing one.

Before making changes:
1. Identify pre-existing user modifications.
2. Do not reset, stash, or revert them automatically.
3. Create or use a branch according to the branch policy below.
4. Confirm that secrets and generated build outputs are ignored.

## 3. Branching model

Use a lightweight trunk-based workflow suitable for a small POC.

- `main`: stable, deployable branch. Production deployments should come from a known, tested commit on `main`.
- `feat/<short-description>`: new feature or meaningful product capability.
- `fix/<short-description>`: bug fix.
- `docs/<short-description>`: documentation-only changes.
- `chore/<short-description>`: dependencies, tooling, configuration, maintenance.
- `hotfix/<short-description>`: urgent production repair.

Examples:
```text
feat/github-oauth
feat/repository-activity
feat/custom-project-labels
fix/activity-threshold-boundaries
docs/coolify-deployment-guide
chore/ci-quality-gates
```

Rules:
- Keep branches focused and short-lived.
- Do not create a new branch for every tiny typo if the current task is already isolated on a suitable feature branch.
- Do not commit directly to `main` unless the user has explicitly chosen that workflow or the repository is a personal prototype with no branch protections; even then, verify tests first.
- Do not merge unrelated work into the current branch.
- Before branching, confirm the worktree status and current branch. If user changes exist, preserve them and avoid accidentally carrying unrelated changes into a commit.
- If the current branch is already appropriate, continue using it.

## 4. Commit conventions

Use Conventional Commits:

```text
type(scope): concise imperative summary
```

Allowed types:
- `feat`: user-visible capability
- `fix`: bug fix
- `docs`: documentation
- `style`: formatting-only changes without behavior change
- `refactor`: code restructuring without intended behavior change
- `perf`: performance improvement
- `test`: tests and test infrastructure
- `build`: build system/dependencies
- `ci`: continuous integration
- `chore`: maintenance

Examples:
```text
docs(workflow): define git and coolify deployment process
feat(repositories): add paginated github repository sync
fix(activity): handle missing activity timestamps
test(activity): cover inactivity threshold boundaries
chore(deploy): add coolify health check configuration
```

Commit requirements:
1. Finish a coherent unit of work.
2. Review the diff:
   ```bash
   git diff --check
   git diff --stat
   git diff
   ```
3. Run relevant tests, lint, typecheck, and build scripts that exist in the repository.
4. Inspect staged changes:
   ```bash
   git status --short
   git diff --cached --check
   git diff --cached --stat
   git diff --cached
   ```
5. Search staged content for likely secrets; do not paste actual secret values into output.
6. Stage only intended paths when the worktree includes unrelated changes.
7. Commit with a concise Conventional Commit message.
8. Verify:
   ```bash
   git log -1 --oneline
   git status --short --branch
   ```

Never create empty commits to trigger deployment. A deployment must correspond to a real, reviewed code/configuration change or a deliberately requested redeploy.

## 5. Versioning and releases

Use Semantic Versioning for tagged releases: `MAJOR.MINOR.PATCH`.

- `0.x.y`: POC/pre-1.0; breaking changes may happen, but document them.
- Patch: backwards-compatible fixes.
- Minor: backwards-compatible capabilities.
- Major: incompatible API, schema, or user-facing behavior changes.

Rules:
- Do not bump the version on every commit. Use commits for development history and tags/releases for meaningful milestones.
- Keep the app/package version source consistent with the package manager and release process.
- Create a release tag only after tests/build pass and the intended commit is on the release branch.
- Use annotated tags, for example:
  ```bash
  git tag -a v0.1.0 -m "GitPulse POC 0.1.0"
  git show v0.1.0
  ```
- Push a tag only when the release is intended and the remote has been verified:
  ```bash
  git push origin v0.1.0
  ```
- Never move or overwrite a published tag to conceal a broken release. Create a new patch release instead.
- If database migrations are included, document whether the release requires a migration and whether rollback is safe.

## 6. Push policy

Before pushing:
1. Confirm the remote URL and branch.
2. Confirm the intended commits with `git log --oneline origin/<branch>..HEAD` where the remote tracking branch exists.
3. Run required quality gates.
4. Verify that no secrets, `.env`, database dumps, credentials, build artifacts, or unrelated user changes are staged.
5. Push only the intended branch.

Normal push:
```bash
git fetch origin
git status --short --branch
git push -u origin <branch-name>
```

If the push is rejected because the remote has new commits:
- Fetch and inspect the divergence.
- Integrate the remote changes safely using the repository's established policy.
- Do not force-push as a quick fix.
- Ask the user if the safe integration path is unclear.

If authentication is unavailable, do not ask the user to paste a token into chat. Explain how to configure a credential helper, SSH key, or the approved secret manager. Never put a token into a Git remote URL.

## 7. Continuous engineering loop and cadence

Use the following cadence throughout development:

### Every small task
- Inspect status and branch.
- Make one coherent change.
- Run the smallest relevant test set.
- Review diff and secrets.
- Commit when the change is complete and verified.

### At the end of each implementation phase
- Run formatting/lint, typecheck, unit tests, integration tests relevant to the phase, and production build.
- Review the full phase diff.
- Update docs and `.env.example` if required.
- Create a meaningful commit or a small sequence of commits.
- Push the branch if a valid remote is configured and pushing is authorized.
- Report exact commit SHA, pushed branch, checks run, failures, and blockers.

### Before every production deployment
- Confirm the exact commit SHA and branch.
- Confirm tests and build pass for that SHA.
- Check migrations and backup/rollback implications.
- Confirm required environment variables are configured in Coolify without exposing their values.
- Verify health/readiness endpoints and production logs after deployment.
- Do not deploy from an unreviewed worktree or an unknown commit.

Do not use a fixed timer to commit or push arbitrary unfinished changes. The interval is task-based: commit after each verified coherent unit, push after a stable checkpoint/phase, and deploy only from a verified production candidate. If the project later adds automated CI, let CI validate each push.

## 8. Coolify first-time deployment — Oracle-2 server, API-token-only

### Goal
Provision the first GitPulse deployment in the user's existing Coolify installation, target the server named **`oracle-2`**, configure the application/database, deploy a verified commit, and confirm health. Use the Coolify API authenticated with an API token for management actions.

### Critical distinction
“API-token-only” means the automation uses Coolify's API for Coolify management instead of browser/UI automation. It does **not** mean the token itself can replace every prerequisite. The API must already be reachable, the token must have appropriate permissions, `oracle-2` must be registered and available in Coolify, and the source repository must be accessible to the deployment mechanism. A private Git repository may require a preconfigured Git provider integration or deploy key. Do not assume the Coolify API token also authenticates GitHub cloning.

Do not deploy to a guessed server ID. Resolve the server by name from Coolify's API and confirm the exact match for `oracle-2`.

### 8.1 Required configuration (never commit)
Configure these securely in the agent's environment/secret manager:
- `COOLIFY_BASE_URL` — base URL of the user's Coolify instance, without a guessed path.
- `COOLIFY_API_TOKEN` — API token with the minimum required permissions.
- `GIT_REPOSITORY_URL` — verified Git repository URL.
- `GIT_BRANCH` — intended deploy branch, normally `main` after review.
- `GIT_COMMIT_SHA` — exact reviewed commit intended for first deployment.
- Application domain/hostname, if one has been selected.
- Production secrets for GitHub OAuth, session signing, token encryption, and database access, stored through Coolify's supported environment/secret configuration.
- Any repository/provider credential required for Coolify to clone a private repository.

Do not ask the user to paste `COOLIFY_API_TOKEN` into source files or a public chat. Prefer a preconfigured secret environment. If the token has already been exposed in logs or chat, recommend revoking and replacing it.

### 8.2 API discovery before mutations
Coolify API endpoints and payload schemas can vary by version. Do not invent endpoint paths, request fields, application types, server IDs, or response shapes.

1. Check the installed Coolify version and its official API documentation/OpenAPI schema.
2. Use the API's documented authentication header and base URL.
3. Make a read-only request to verify authentication and inspect available resources.
4. List registered servers and resolve `oracle-2` by exact name.
5. Inspect existing projects, applications, databases, destinations, and resources to avoid duplicates.
6. Inspect available Git/source and application-type options supported by this installed version.
7. Save only non-secret IDs and status details needed for the workflow. Never echo the API token.
8. Before creating resources, determine whether an existing resource can safely be reused. Do not delete or overwrite an existing resource without explicit approval.

If API authentication fails, stop mutations and report the HTTP status plus a sanitized error. Do not try browser automation or shell/SSH deployment as a fallback; the requirement is Coolify API management only.

### 8.3 Resource creation order
Follow the exact documented API flow for the installed version. A typical dependency order is:

1. Create or reuse the **GitPulse project**.
2. Create or reuse the appropriate environment (for example, production).
3. Create the PostgreSQL resource/database in the correct project/environment and on the intended destination if Coolify supports that topology.
4. Create the API service from the repository and selected branch/commit, using the correct Dockerfile or Docker Compose configuration.
5. Create the web service if it is a separate deployable app. If the architecture is a monorepo, configure each service's correct build context and Dockerfile.
6. Link the API to PostgreSQL using private internal networking and the database service's actual internal hostname/port. Do not guess a service name.
7. Configure secrets and environment variables through the documented API; never place production secrets in repository files or build-time public variables.
8. Configure persistent storage only where required. PostgreSQL data must use a persistent volume and a documented backup strategy.
9. Configure domain, TLS, routing, and health checks through supported Coolify resources/settings.
10. Trigger the first deployment only after configuration validation and a successful build/test for the chosen commit.

If the repo uses Docker Compose, inspect the existing compose file and make it compatible with the installed Coolify version. Avoid defining a second externally exposed database port unless explicitly needed. Do not invent a `docker-compose.yml` if a correct deployment configuration already exists.

### 8.4 Deployment safety requirements
- Target the exact registered server `oracle-2`; verify its ID and status immediately before creating/assigning resources.
- Use only documented Coolify API calls for Coolify project/resource creation, configuration, deployment triggering, status checks, and log retrieval.
- Do not use SSH, shelling into the server, browser automation, or direct Docker commands as a substitute for Coolify API management.
- Do not expose PostgreSQL publicly by default. Use internal service networking.
- Configure `NODE_ENV=production` and the correct production build/start commands.
- Run database migrations as a controlled release step, not unpredictably on every replica start.
- Use health/readiness checks. API liveness should not be confused with database readiness.
- Configure reasonable resource limits only after checking `oracle-2` capacity. Never guess that memory/CPU is available.
- Keep OAuth callback URL, web origin, and public API URL consistent with the chosen domain and TLS setup.
- Ensure secrets are available at runtime, not unnecessarily embedded into frontend bundles or image layers.
- Make sure logs redact tokens and credentials.
- Avoid destructive redeploy options, resource deletion, volume deletion, or database recreation.
- Do not claim the deployment is live until Coolify reports a successful deployment and the public/internal health checks pass.

### 8.5 First deployment verification
After triggering deployment through the API:

1. Poll the documented deployment/resource status endpoint at a sensible interval with a bounded timeout. Do not create duplicate deployments on each poll.
2. Retrieve build/deployment logs through the API and inspect failures without printing secrets.
3. Verify the intended commit SHA was deployed, where Coolify exposes it.
4. Verify web route and API health/readiness endpoints.
5. Verify the API can reach PostgreSQL using a health check that does not expose credentials.
6. Verify migrations completed and required tables exist through application readiness or documented database health checks.
7. Verify OAuth configuration is present without displaying secret values. Live OAuth may remain unverified until a real callback can be tested.
8. Verify TLS/domain routing if a domain was configured.
9. Review logs for crash loops, repeated restarts, migration failures, rate-limit loops, and leaked secrets.
10. Record the resource IDs, deployment ID, commit SHA, final status, health-check outcomes, and any remaining setup requirements. Never record the API token or secret values.

If a check fails, diagnose the specific cause and make the smallest safe correction. Do not repeatedly redeploy unchanged broken code. If the deployment is unhealthy, stop and report the state rather than presenting it as complete.

### 8.6 Rollback and repeat deployment
- Record the last known-good deployment/commit before replacing production.
- Prefer Coolify's documented rollback/redeploy capability for the known-good revision when safe.
- Treat database schema rollback separately; code rollback does not automatically reverse data migrations.
- Never delete the database or its persistent volume as a troubleshooting step.
- For future deployments, repeat: inspect → tests/build → commit → push → verify remote SHA → configure/migrate if needed → deploy via Coolify API → health checks → report.
- Use CI to gate deployments if configured; do not bypass failing checks for convenience.

## 9. Coolify API error handling

For each mutation:
- Check the HTTP status and response body.
- Validate that the returned resource ID/name matches the intended target.
- Store resource IDs in a secure deployment record or non-secret project documentation if appropriate.
- If a request times out, query the resource list/status before retrying; the server may have completed the mutation.
- Use idempotent create-or-reuse logic where possible.
- Do not blindly retry non-idempotent resource-creation calls.
- Handle 401/403 by checking token validity and permissions; do not print the token.
- Handle 404 by verifying API version, base URL, and documented route.
- Handle 409/422 by inspecting existing resources and validation errors before changing payloads.
- Handle 429 and 5xx with bounded backoff.
- Never invent an endpoint or claim a resource was created from an ambiguous response.

## 10. Completion report template

At the end of each phase or deployment attempt, report:

```text
Git branch:
Commit SHA:
Remote push: confirmed / not configured / failed
Tests and build:
Coolify API authentication: verified / blocked
Coolify project/environment:
Target server: oracle-2 (verified ID)
Database resource:
Web/API resources:
Deployment ID and deployed SHA:
Health checks:
Domain/TLS:
Secrets configured: yes/no (never list values)
Known limitations or blockers:
Next action:
```

Use “not verified” when evidence is missing. Do not label an attempt successful if only the resource was created but the deployment or health checks failed.

## 11. Stop conditions — ask for the missing prerequisite

Stop before mutations if any of these apply:
- No secure Coolify API token is available to the execution environment.
- Coolify base URL or installed API schema cannot be verified.
- `oracle-2` cannot be uniquely identified or is offline/unavailable.
- The intended repository/branch/commit is unknown or inaccessible.
- Required production secrets/domains are missing and no safe placeholder/development configuration is appropriate.
- An existing resource may be overwritten, deleted, or materially changed.
- Server capacity is insufficient or unknown for a potentially disruptive deployment.
- API behavior is ambiguous after a mutation.
Continue any independent local code/documentation work that is safe, but do not claim the first deployment has happened.
