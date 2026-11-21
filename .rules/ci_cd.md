# Continuous Integration

Continuous integration (CI) is one workflow, `.github/workflows/ci.yml`, with one job, `check`.

## What it runs

`bun install --frozen-lockfile`, then `lint`, `typecheck`, `test`, `schema --check`, `validate`,
and `transitions` against the base revision, on a pull request and on a push to `main`.

## Rules

- **CI never holds an EZID credential and never contacts EZID.**
  Minting is a separate workflow that a person starts, in a protected environment (Architecture Decision Record (ADR) 0005).
  Never add `schedule`, `push`, `pull_request`, `release`, `workflow_run` or `repository_dispatch` to a workflow that can read an EZID secret.
- `check` is the one required check and has no path filter, so it always reports.
- Permissions are `contents: read` unless a job states why it needs more.
- Actions are pinned by commit, with the version in a comment.
- Superseded runs are canceled, and the job has a timeout.
- A pull request never gets `pull_request_target`.
- `transitions` also refuses a record issued by hand, and **CI never allows issuance**: it never passes `--allow-issue`, on a pull request or on a push. Only the mint workflow (not built yet; a dedicated GitHub App identity, a branch of this repository, one verified commit authored by the App) runs `transitions --allow-issue` itself and pushes through its own path. Until then nothing can be issued.
- A push to `main` is never canceled and has its own concurrency group, so every before-to-after range is checked.
- Do not weaken a check to get a change through. A failing `transitions` means the change would delete or reassign a registered Digital Object Identifier (DOI).

## Deploying

Nothing deploys from CI today.
The page is deployed by the owner (`docs/owner-actions.md`); whether a later workflow deploys it on a merge to `main` is an open decision in `.context/plan.md`.
