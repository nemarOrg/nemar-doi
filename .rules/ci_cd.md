# Continuous Integration

Continuous integration (CI) is one workflow, `.github/workflows/ci.yml`, with one job, `check`.

## What it runs

`bun install --frozen-lockfile`, then `lint`, `typecheck`, `test`, `schema --check`, `validate`,
and on a pull request `transitions` against the base branch.

## Rules

- **CI never holds an EZID credential and never contacts EZID.**
  Minting is a separate workflow that a person starts, in a protected environment (Architecture Decision Record (ADR) 0005).
  Never add `schedule`, `push`, `pull_request`, `release`, `workflow_run` or `repository_dispatch` to a workflow that can read an EZID secret.
- `check` is the one required check and has no path filter, so it always reports.
- Permissions are `contents: read` unless a job states why it needs more.
- Actions are pinned by commit, with the version in a comment.
- Superseded runs are canceled, and the job has a timeout.
- A pull request never gets `pull_request_target`.
- Do not weaken a check to get a change through. A failing `transitions` means the change would delete or reassign a registered Digital Object Identifier (DOI).

## Deploying

Nothing deploys from CI today.
The page is deployed by the owner (`docs/owner-actions.md`); whether a later workflow deploys it on a merge to `main` is an open decision in `.context/plan.md`.
