# ADR 0008: One EZID credential, split by policy: nemar-cli mints datasets, nemar-doi mints everything else

**Status:** accepted
**Date:** 2026-11-21
**Owner:** Seyed Yahya Shirazi

## Context

NEMAR already holds one EZID credential for the whole shoulder `10.82901/nemar.`, and nemar-cli uses it to mint dataset Digital Object Identifiers (DOIs).
This registry needs to mint the other DOIs under the same shoulder (ADR 0001).
The first design asked EZID for a second user, so that EZID's ownership rule (an identifier is updated only by its owner) would separate the two.
The owner decided on 2026-11-21 that there is no separate EZID user.

## Decision

- **There is one credential.** nemar-doi uses the same EZID credential as nemar-cli.
  It is stored as the secrets `EZID_USERNAME` and `EZID_PASSWORD` in a protected GitHub environment of this repository named `ezid-production`, whose runs the owner approves (ADR 0005).
  No other job, branch or environment can read it.
- **The split is a policy, enforced in code on each side.**
  nemar-cli mints only dataset suffixes, `nemar.nm…` and `nemar.on…`, and refuses any other suffix before it calls EZID.
  nemar-doi mints every other suffix under the shoulder, and its validator refuses a dataset-shaped name (`DATASET_SHAPED_NAME`, ADR 0002), so the mint run cannot create or touch a dataset suffix.
- **The nemar-cli guard is filed as a follow-up** (nemarOrg/nemar-cli issue 2281), with a test that pins the dataset suffix shape and fails if the guard is removed.
  Until it lands, the guarantee on nemar-cli's side rests on its current code (`buildConceptIdentifier`) alone.

## Consequences

- Nothing has to be requested from EZID, and the credential is not copied anywhere new except the one protected environment.
- A fault in either code base could in principle write to the other's identifiers, because EZID sees one user.
  The guards, the one-DOI-per-run approval and the rule that no code deletes (ADR 0004) are what stand in its place.
- Rotating the credential means updating it in both places: nemar-cli's secrets and the `ezid-production` environment.
- The mint code must derive the identifier from a record and never accept a free-form one, so that the dataset guard cannot be bypassed by a typo.

## Alternatives considered

- **A second EZID user for this registry:** a real boundary, since EZID lets only the owner update an identifier, but it means a request to EZID and a second credential to keep.
  Rejected by the owner.
- **Mint through nemar-cli's backend:** one credential in one place, but every non-dataset DOI would wait on a nemar-cli release.
  Rejected.

## Receipts

- Owner decision of 2026-11-21.
- ADR 0001, ADR 0002 and ADR 0005 of this repository; nemar-cli ADR 0007.
- nemar-cli `backend/src/services/doi.ts` (`buildConceptIdentifier`) and nemar-cli issue 2281.
