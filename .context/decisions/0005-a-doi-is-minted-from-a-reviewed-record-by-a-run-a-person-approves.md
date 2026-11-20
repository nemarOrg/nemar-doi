# ADR 0005: A DOI is minted only from a reviewed record, by a run a person approves

**Status:** accepted
**Date:** 2026-11-20
**Owner:** Seyed Yahya Shirazi

## Context

A public Digital Object Identifier (DOI) and its DataCite record cannot be recalled, only amended (nemar-cli ADR 0018).
nemar-cli protects dataset DOIs with an automated metadata gate, because datasets arrive faster than anyone could read them.
This registry sees a few requests a year, each for something NEMAR itself publishes,
so it can afford the stricter rule that ADR 0018 set aside only for its cost: a person reads every record before it becomes an identifier.

## Decision

- **EZID is the only registrar** (nemar-cli ADR 0007).
  Nothing here talks to Zenodo, and nothing talks to DataCite except to read.
- **A request is a pull request** that adds a `planned` record, opened by a maintainer of the repository the DOI will name.
  An administrator who is not its author reviews it; a new name also needs the owner.
- **Metadata is validated before minting.**
  The record must pass the schema, carry every property DataCite requires plus an abstract and a license,
  name a tag and a commit if it is a release, and resolve to a page that is already live.
  A person is cited by given and family name, with an Open Researcher and Contributor ID (ORCID) iD where they have one, or not at all (nemar-cli ADR 0041).
- **Minting is a separate, deliberate act.**
  A run that a named person approves mints exactly one DOI, from the record as it stands on `main`:
  it creates the identifier as `reserved`, reads it back, compares it with what it sent, and only then makes it `public`.
  The identifier is always the one derived from the record; EZID is never asked to invent one.
- **No unattended job can mint.**
  No workflow that starts on a schedule, a push, a merge, a tag or a call from another repository may hold or use EZID credentials.
- **The result comes back as a pull request** that sets the record's state and its `registered` block.

The procedure is in [`docs/minting.md`](../../docs/minting.md).
No code in this repository contacts EZID yet.

## Consequences

- One DOI costs two pull requests and an approval.
  That is the intended price of a permanent identifier at this volume.
- Between the mint and the merge of the pull request that records it, EZID and the registry disagree.
  The mint is safe to run again, and a read-only reconcile reports the difference; it repairs nothing.
- This repository will hold an EZID credential.
  It must not be the account that owns the dataset DOIs, or a fault here could rewrite them:
  EZID lets an identifier be updated only by its owner, so a separate EZID user is a real boundary
  (see the owner actions in [`docs/owner-actions.md`](../../docs/owner-actions.md)).
- A source repository cannot get a DOI by tagging a release.
  Its maintainer asks, after the tag exists.

## Alternatives considered

- **Mint when the request merges:** one step fewer, but then the merge button mints,
  a workflow with EZID credentials runs on every push to `main`, and a merge made by mistake is permanent.
  Rejected.
- **Mint from the source repository's release workflow:** convenient, and exactly the unreviewed automated job the owner ruled out.
  Rejected.
- **The automated judge nemar-cli uses for datasets:** it exists because of import volume, which this registry does not have.
  Rejected in favor of a person.
- **Mint through nemar-cli's backend, which already holds EZID credentials:** it keeps one credential in one place,
  and it ties every non-dataset DOI to a nemar-cli release.
  Kept as the fallback if EZID cannot provide a separate user.

## Receipts

- Owner direction of 2026-11-20: reviewed by pull request, never minted by an unreviewed automated job.
- nemar-cli ADR 0007, ADR 0018 and ADR 0041.
- EZID's ownership model (`https://ezid.cdlib.org/doc/apidoc.html`, read on 2026-11-20):
  an identifier may be updated only by its owner, a proxy of its owner, or an administrator of its group.
- [`src/registry.ts`](../../src/registry.ts) (`mintReadyProblems`).
