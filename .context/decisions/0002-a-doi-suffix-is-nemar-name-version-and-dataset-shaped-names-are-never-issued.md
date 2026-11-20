# ADR 0002: A DOI suffix is `nemar.<name>.v<version>`, and a dataset-shaped name is never issued here

**Status:** proposed
**Date:** 2026-11-20
**Owner:** Seyed Yahya Shirazi

## Context

nemar-cli mints `10.82901/nemar.<dataset id>` for a dataset and `10.82901/nemar.<dataset id>.v<version>` for each of its versions,
where a dataset id is two letters and six digits (`nm000103`, `on009081`).
nemar-doi mints under the same shoulder (ADR 0001), and a Digital Object Identifier (DOI) can never be renamed,
so the shape of a name has to be right before the first one exists.
The owner named the first two: `nemar.biosig-zarr.v3` and `nemar.process.vN`.

## Decision

A DOI this registry issues is `10.82901/nemar.<name>.v<major>` or `10.82901/nemar.<name>.v<major>.<minor>.<patch>`.

- A **name** is 3 to 32 characters: lowercase letters and digits in segments joined by single hyphens, starting with a letter.
  Nothing else is allowed: no uppercase, underscore, dot, slash or space.
- A **version** is written with no leading zeros and no pre-release or build part.
- The registry writes a DOI in lowercase everywhere.
  A DOI is not case-sensitive, and EZID's own spelling is the uppercase form behind `doi:`, derived and never typed.
- A name made of letters followed only by digits is **dataset-shaped**.
  That whole space, for any prefix and any number of digits, belongs to nemar-cli, and this registry refuses to issue from it.
- A name is declared in `registry/names.json` before any DOI uses it; a new name needs the owner's approval.
  A short list of reserved names (`nemar`, `doi`, `dataset`, `test` and the like) is never given out.

The grammar is implemented once, in [`src/doi.ts`](../../src/doi.ts), and described in [`docs/naming.md`](../../docs/naming.md).

## Consequences

- The two registries cannot collide, and neither has to ask the other before minting:
  every dataset suffix is dataset-shaped and no suffix issued here is.
- nemar-cli must keep minting only dataset-shaped suffixes.
  Today that follows from its code (`buildConceptIdentifier`), and it should pin it with a test that names this ADR.
- Some reasonable names are refused: `eeg2` is dataset-shaped, so it would have to be `eeg-2`.
- The name is in every citation for good.
  It cannot follow a repository that is renamed, which is why a name is short, says what the thing is, and is approved by the owner.
- The suffix is readable, so it also makes a promise: a reader will assume `nemar.biosig-zarr.v3` is version 3 of biosig-zarr.
  ADR 0003 and ADR 0004 are what keep that promise.

## Alternatives considered

- **A second shoulder for non-dataset DOIs** (for example `10.82901/nemar-reg.`): disjoint by prefix, but it is one more namespace to explain,
  and the owner's examples sit directly under `nemar.`.
  Rejected.
- **A type segment** (`nemar.spec.biosig-zarr.v3`): the type is already in the DataCite record, and a thing that changes type would be stuck with the old word.
  Rejected.
- **Opaque suffixes minted by EZID:** nothing to collide and nothing to argue about,
  but dataset DOIs are readable and a registry of unreadable names needs a lookup for every use.
  Rejected.
- **Allow underscores or dots in a name:** an underscore vanishes in an underlined link, and a dot is the separator before the version.
  Rejected.

## Receipts

- nemar-cli `backend/src/services/doi.ts` (`buildConceptIdentifier`, `buildVersionIdentifier`) and ADR 0011 there (dataset ids are assigned in reserved bands).
- [`test/doi.test.ts`](../../test/doi.test.ts): every dataset id shape is refused.
