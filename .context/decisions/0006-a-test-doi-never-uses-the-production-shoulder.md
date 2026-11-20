# ADR 0006: A test DOI never uses the production shoulder

**Status:** accepted
**Date:** 2026-11-20
**Owner:** Seyed Yahya Shirazi

## Context

Under ADR 0004 a Digital Object Identifier (DOI) is permanent from the moment it is reserved, and a public one is harvested by DataCite within minutes.
There is no such thing as trying a name out on the production shoulder.
EZID provides a test shoulder, `10.5072/FK2`, whose identifiers are removed after about two weeks,
and nemar-cli already uses it for its staging and exemplar datasets (nemar-cli ADR 0007).

## Decision

- Every DOI made for a test, a rehearsal, a demonstration or the staging page is on the EZID test shoulder,
  written `10.5072/fk2nemar.<name>.v<version>`.
- A record under the production shoulder `10.82901/nemar.` exists in exactly one place, `registry/dois/`,
  and that directory accepts nothing else.
  Fixtures live under `test/` and are on the test shoulder.
- The code that will mint chooses its EZID credentials from the DOI it was given, as nemar-cli does,
  and refuses a production DOI unless it runs from `main` in the protected environment (ADR 0005).
- A name is never registered on production "to see what it looks like", and never reserved to hold it.

## Consequences

- A rehearsal proves the calls, the escaping and the metadata, and nothing about findability:
  a test identifier does not reach DataCite's production index.
  The first production mint is therefore watched by a person.
- Test identifiers lapse.
  The staging page will show DOIs that no longer resolve, which is expected and says nothing about production.
- A fixture can never be mistaken for a registered DOI, and a registered DOI can never be a fixture.

## Alternatives considered

- **Reserve on production, then delete:** it uses the one EZID operation ADR 0004 forbids, and a failed cleanup leaves a real identifier behind.
  Rejected.
- **A `nemar.test` name on production:** permanent test records in DataCite, under NEMAR's name.
  Rejected.

## Receipts

- Owner direction of 2026-11-20: a test DOI never uses the production shoulder.
- nemar-cli `backend/src/services/ezid.ts` (`PRODUCTION_SHOULDER`, `TEST_SHOULDER`, `isTestShoulder`).
- [`src/doi.ts`](../../src/doi.ts) (`SHOULDERS`) and [`src/registry.ts`](../../src/registry.ts) (`checkRegistry` takes one shoulder).
