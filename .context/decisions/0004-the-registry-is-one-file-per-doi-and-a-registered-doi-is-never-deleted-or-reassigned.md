# ADR 0004: The registry is one file per DOI, and a registered DOI is never deleted or reassigned

**Status:** accepted
**Date:** 2026-11-20
**Owner:** Seyed Yahya Shirazi

## Context

A Digital Object Identifier (DOI) is a promise that an identifier will keep meaning one thing.
The registrar enforces only part of it: EZID will not delete a public identifier, but it will delete a reserved one,
and it will let the owner point any identifier at a new address or replace its whole description.
The rest of the promise has to be kept by whoever holds the record, and the registry needs a store that makes the record reviewable.

## Decision

- **One file per DOI**, `registry/dois/<suffix>.json`, in this repository.
  Git is the store and a reviewed pull request is the only write path.
  A record holds the DOI, its state, where it resolves, what it names, and the DataCite metadata.
  Its shape is declared once, in [`src/schema.ts`](../../src/schema.ts), and is strict: an unknown property is an error.
- **Four states.**
  `planned` means only this registry knows the name; nothing exists at EZID.
  `reserved`, `public` and `unavailable` are EZID's own statuses.
- **From `reserved` on, a record is permanent.**
  Its file is never deleted or renamed, its state never returns to an earlier one, and what it names (repository, tag, commit) never changes.
  Nothing here ever sends EZID a delete, not even for a reserved identifier.
- **Withdrawal is a tombstone.**
  The state becomes `unavailable` with a reason and a date; the DOI keeps resolving, to a page that says so.
- A planned record is an announcement, not an identifier: it may be changed, renamed or removed by pull request.
- The address a DOI resolves to and its descriptive metadata may be corrected by pull request, and the correction is then sent to EZID.

Continuous integration (CI) compares every pull request with its base and refuses one that breaks these rules (`bun run transitions`).

## Consequences

- A mistake that reaches `reserved` is permanent.
  A misspelled name stays in the registry and is never reused, so the review before a mint is the only cheap moment.
- The git history is the audit log: who proposed a DOI, who approved it, and every change since.
- The repository is public, so a record is public from the moment its pull request opens.
  Nothing that is still confidential can be requested here.
- There is no database to run, back up or migrate, and the page can be built from files.
- A registered DOI can outlive what it names.
  The record then says `unavailable` and why; it does not disappear.

## Alternatives considered

- **A database table behind a service:** a write path that is not a pull request, and a service to secure and back up, for a handful of records a year.
  Rejected.
- **One file for the whole registry:** every request conflicts with every other, and a diff of one DOI is hard to see.
  Rejected.
- **EZID as the only record:** no planned state, no review before the identifier exists, and no account of what was requested.
  Rejected.
- **Delete a reserved identifier that turns out to be a mistake:** EZID allows it, but the name may already have been seen and written down,
  and "never deleted" with an exception is a rule nobody can check.
  Rejected.

## Receipts

- Owner direction of 2026-11-20: a DOI is never deleted or reassigned.
- EZID's interface documentation (`https://ezid.cdlib.org/doc/apidoc.html`, read on 2026-11-20): only a reserved identifier can be deleted.
- [`src/registry.ts`](../../src/registry.ts) (`transitionProblems`) and [`docs/registry-format.md`](../../docs/registry-format.md).
