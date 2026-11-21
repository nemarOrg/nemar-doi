# ADR 0003: A major line is the concept DOI and each release is a version DOI

**Status:** accepted
**Date:** 2026-11-21
**Owner:** Seyed Yahya Shirazi

## Context

A dataset has one concept Digital Object Identifier (DOI) and one version DOI per release, tied together in DataCite by `HasVersion` and `IsVersionOf`.
A specification or a piece of software is different in one way that matters to a citation:
a new major version is a different thing to its readers.
A program that reads biosig-zarr 2 cannot read biosig-zarr 3, so "biosig-zarr" alone does not say which format a paper used.
The owner asked for one DOI per major format version, with the releases under it.

## Decision

- **The line DOI** `nemar.<name>.v<major>` is the concept: it names that major version as a whole and resolves to a page that lists its releases.
- **The release DOI** `nemar.<name>.v<major>.<minor>.<patch>` is the version: it names one released, tagged text or build, pinned to a commit, for good.
- A line is registered together with its first release, never earlier, and a release is registered only after its line.
- A pre-release (a draft, a beta, a release candidate) gets no DOI.
  The grammar has no way to write one.
- The bare name `nemar.<name>` is reserved for a DOI that would cover every major version.
  It is not issued; enabling it takes a new ADR.
- The version relations are **derived, never stored**:
  at mint time a release is given `IsVersionOf` its line, a line is given `HasVersion` for each public release,
  and consecutive releases and consecutive lines are given `IsNewVersionOf` and `IsPreviousVersionOf`.
  A record that stores one of these relations is refused.

## Consequences

- A citation can say exactly as much as its author knows: "version 3 of the format" (the line) or "release 3.1.0" (the release).
- Registering a release also re-sends the DataCite record of its line and of the release before it, so one mint run touches up to three identifiers.
- A draft cannot be cited by DOI.
  It is cited by its tag and commit, which is honest about what a draft is.
- There is no DOI for "biosig-zarr, whatever the version" until someone makes the case for one.
- Version 0 is a line like any other (`nemar.process.v0`), for software that has releases before it has a 1.0.

## Alternatives considered

- **One concept per name, every release under it, as for datasets:** a citation of the concept would silently come to mean an incompatible format.
  Rejected, and the owner asked for the per-major form.
- **Release DOIs only:** nothing stands for "version 3" between two releases, which is how most people will cite a format.
  Rejected.
- **A DOI for each draft:** a permanent identifier for a text whose purpose is to be replaced.
  Rejected.
- **Store the version relations in each record:** every release would mean editing its line's record by hand, and the two would disagree sooner or later.
  nemar-cli rebuilds a dataset's `HasVersion` list at each mint for the same reason.
  Rejected.

## Receipts

- nemar-cli `backend/src/services/doi.ts` (`createEzidVersionDoi`): `IsVersionOf` on the version, `HasVersion` rebuilt on the concept.
- `10.82901/nemar.nm000103.v2.0.0` as registered at DataCite, read on 2026-11-20.
- [`src/schema.ts`](../../src/schema.ts) (`RELATION_TYPES`) and [`src/registry.ts`](../../src/registry.ts).
