# AGENTS

## Operating contract for SkyrakSys HRM

This repository is a production-scale HRM application with a live backend, frontend, documentation set, and a broad archive of historical artifacts.

## Source of truth

Use the following as the active baseline:

- [README.md](README.md)
- [docs/README.md](docs/README.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/HELP_AND_SUPPORT.md](docs/HELP_AND_SUPPORT.md)
- [backend/](backend)
- [frontend/](frontend)

## Archive boundary

Historical material must stay under:

- [archive/](archive)
- [logs/](logs)

These folders contain generated outputs, prior investigations, old runbooks, and superseded review artifacts. They are historical reference only and should not be used as the live support path.

## Agent team

Use a simple operating model with focused roles:

- Architecture lead: cross-layer system decisions and route boundaries
- Backend safety: auth, middleware, validation, models, and database behavior
- Frontend UX: route integrity, UI flows, and help consistency
- Docs/support: live help, deployment, and operator guidance
- QA/regression: targeted functional checks and dry runs
- Archive/cleanup: keep stale or generated content out of the active path

## Best practices

- Prefer small, focused changes with clear validation evidence.
- Update the matching docs whenever runtime behavior changes.
- Treat the archive as read-only reference unless archival cleanup is explicitly requested.
- Do not rely on historical deployment artifacts when the active docs already provide the supported path.
- Validate the small relevant behavior before claiming completion.

## Required output pattern for agents

When making or reviewing changes, keep the work aligned with:

1. active code path
2. active docs/support path
3. archive boundary for stale or generated content
4. targeted validation evidence

Use the repo documentation and support channels as the operational source of truth, not the historical notes stored in archive directories.
