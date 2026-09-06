# Project Documentation

This is the active documentation set for the current implementation. It replaces outdated deployment and architecture notes that were left behind by previous stages of the project.

## Active documentation

Current validation snapshot: the verified green workflow set includes authentication/security, employee service, leave, and payroll. Attendance, invoice, and project/task remain open pending final evidence capture.

- [ARCHITECTURE.md](ARCHITECTURE.md) — application structure, services, runtime architecture, and system boundaries
- [DEPLOYMENT.md](DEPLOYMENT.md) — supported production deployment path, Docker Compose flow, and host requirements
- [SECURITY.md](SECURITY.md) — auth, JWT, secrets, RBAC, encryption, and hardening guidance
- [HELP_AND_SUPPORT.md](HELP_AND_SUPPORT.md) — live user and operator support workflow guidance
- [WORKSPACE_AUDIT_AND_CLEANUP_PLAN.md](WORKSPACE_AUDIT_AND_CLEANUP_PLAN.md) — repo-wide audit, archive policy, and cleanup plan
- [AGENT_TEAM_AND_BEST_PRACTICES.md](AGENT_TEAM_AND_BEST_PRACTICES.md) — agent roles and working rules
- [QA_AGENT_COVERAGE_MATRIX.md](QA_AGENT_COVERAGE_MATRIX.md) — parallel agent workflow, module coverage plan, and evidence standard
- [../README.md](../README.md) — repository overview and quick start
- [../AGENTS.md](../AGENTS.md) — active operating contract for repo-wide work
- [deployment/CANONICAL_DEPLOYMENT.md](deployment/CANONICAL_DEPLOYMENT.md) — canonical Docker deployment flow
- [deployment/RED_HAT_PRODUCTION_RUNBOOK.md](deployment/RED_HAT_PRODUCTION_RUNBOOK.md) — Red Hat production operations guide
- [deployment/OPERATOR_DEPLOYMENT_GUIDE.md](deployment/OPERATOR_DEPLOYMENT_GUIDE.md) — operator checklist and execution steps
- [deployment/DEPLOYMENT_CHEAT_SHEET.md](deployment/DEPLOYMENT_CHEAT_SHEET.md) — one page reference

## Archive

Superseded deployment and generated review material is stored under [../archive](../archive) and [../archive/legacy-docs](../archive/legacy-docs). Those files are historical reference only and must not be used as the active production runbook.

## Documentation rules

- These files are the source of truth for the current implementation.
- Any product, deployment, or security change must update the relevant active document.
- Legacy reports or build artifacts remain in archive folders and are not part of the live support process.
- Any new workspace audit, agent task, or cleanup plan must be captured here and reflected in the root operating contract in [../AGENTS.md](../AGENTS.md).
- Active support and operations guidance must always point to the live docs set, not historical notes under [../archive](../archive).
