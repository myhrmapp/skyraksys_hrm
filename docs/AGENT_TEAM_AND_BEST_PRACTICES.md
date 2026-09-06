# Agent Team and Best Practices

## Purpose

This document defines the default agent model for SkyrakSys HRM work and explains the rules for safe, maintainable changes across the repo.

## Recommended agent team

### 1. Architecture and repo lead

Responsibilities:
- understand cross-layer change impact
- maintain system boundaries between frontend, backend, DB, and docs
- guide route, model, and security decisions
- verify large changes do not break the overall operating model

Best practices:
- review the active docs before changing architecture assumptions
- check both runtime and support docs when a change touches contracts or routes
- keep changes narrow and explain cross-module impact clearly

### 2. Backend safety agent

Responsibilities:
- validate middleware, auth, roles, and request flow
- review model changes, migrations, database assumptions, and validation logic
- confirm configuration and secret checks remain safe and explicit

Best practices:
- verify environment validation and startup checks before trusting a local run
- avoid silent fallback behavior when secrets, DB settings, or auth rules are missing
- test the real behavior of auth, RBAC, and validation changes instead of relying only on mocks

### 3. Frontend UX and route agent

Responsibilities:
- maintain user flows, form behavior, route structure, and UI state integrity
- ensure help pages and route access remain valid for the current roles
- validate that UI assumptions match backend responses and user expectations

Best practices:
- check real page behavior and route access, not only component rendering
- keep the help manifest and user-guide content aligned with current flows
- avoid leaving hidden stale routes or dead links in the UX

### 4. Docs and support agent

Responsibilities:
- keep the live docs set accurate and consistent
- maintain support guidance and help content for end users and admins
- keep archive material clearly separated from active instructions

Best practices:
- update the relevant docs in the same change set as any functional or operational change
- prefer active docs and support files over historical notes in all support scenarios
- treat the archive as historical reference only, not as operational guidance

### 5. QA and regression agent

Responsibilities:
- verify critical user workflows after changes
- run targeted dry runs or smoke tests before broad validation
- check for regressions in auth, payroll, leave, employee, and deployment workflows
- confirm all scenarios satisfy the parallel module coverage matrix before sign-off

Best practices:
- start with the smallest meaningful validation path
- verify actual behavior, not just expected logs or static assumptions
- record changes and evidence in the working notes or audit docs
- require UI, API, and DB proof for each scenario before marking a module complete

See [QA_AGENT_COVERAGE_MATRIX.md](QA_AGENT_COVERAGE_MATRIX.md) for the parallel team model, module checklist, and final evidence standard.

### 6. Archive and cleanup agent

Responsibilities:
- classify stale files and ensure they are archived appropriately
- keep generated outputs, logs, and duplicate reports out of the active support path
- maintain a clean distinction between live repo work and historical artifacts

Best practices:
- move generated or historical content to archive/ with a summary or note
- avoid reintroducing stale files as active docs or support references
- use archival boundaries to protect the current product and help experience

## Shared operating rules

1. Respect the active docs set
   - Use the repo root README, docs/, backend/, and frontend/ as the active source of truth.
   - Historically generated output stays in archive/ unless it is still required for live operations.

2. Prefer small and explicit changes
   - One concern per change set when possible.
   - Avoid mixing functional fixes, refactors, and documentation cleanup unless necessary.

3. Verify before claiming completion
   - Run the smallest valid check for behavior or syntax.
   - Record evidence instead of making assumptions.

4. Keep help and docs synchronized
   - If a workflow, route, secret, limiter, or config changes, update the matching help or docs page.

5. Maintain a clean archive boundary
   - Historical notes remain reference only.
   - They should not appear in live support flows or active deployment guidance.

## Minimal workflow for every task

1. Review the active docs and app state.
2. Identify whether the change affects code, docs, help, security, or deployment.
3. Apply the minimum necessary fix or update.
4. Validate the relevant behavior or config.
5. Archive stale or generated artifacts that are no longer support material.
6. Summarize the outcome for the next agent or operator.

## Recommended repo conventions

- Keep root README and docs/README.md aligned with the current runtime model.
- Use archive/ for old deployment scripts, historical reports, and generated logs.
- Treat tests and reports as evidence, not as live code or documentation.
- Use support guidance in docs/HELP_AND_SUPPORT.md as the default user/operator manual.

This keeps the workspace maintainable without losing the project history that was built during investigation, QA, and deployment work.
