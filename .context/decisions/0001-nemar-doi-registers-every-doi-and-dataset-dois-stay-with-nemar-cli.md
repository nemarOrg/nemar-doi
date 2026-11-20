# ADR 0001: nemar-doi is the registry of every NEMAR DOI, and dataset DOIs stay with nemar-cli

**Status:** accepted
**Date:** 2026-11-20
**Owner:** Seyed Yahya Shirazi

## Context

NEMAR issues every Digital Object Identifier (DOI) under the prefix `10.82901`, through EZID (nemar-cli ADR 0007).
On 2026-11-20 DataCite listed 2,556 findable DOIs under that prefix, and every one of them names a dataset or a dataset version:
nemar-cli's backend mints them when a dataset is published and records them in its own database.
NEMAR now needs DOIs for things that are not datasets, first the releases of the biosig-zarr specification and of nemar-process,
and there is no place that says which DOIs exist, what each one names, or who may ask for one.

## Decision

nemar-doi is the registry of every DOI NEMAR issues.
It is the registry of record for every DOI that does not name a dataset.
Dataset DOIs (the `nm` and `on` prefixes today) are delegated to nemar-cli:
nemar-cli mints them, stores them and is their only record,
and nemar-doi lists them by reading nemar-cli's public interface, never by keeping a copy.

## Consequences

- Two systems mint under one prefix, so their suffixes must be unable to collide by construction, not by coordination (ADR 0002).
- A new kind of DOI comes here.
  It does not get a third registry, and it does not go into nemar-cli unless it names a dataset.
- The dataset half of the page at doi.nemar.org depends on nemar-cli being reachable.
  When it is not, the page says so and still serves the half it owns (ADR 0007).
- nemar-cli owes the registry one read-only listing; the contract is in [`docs/delegation.md`](../../docs/delegation.md).
- Everything nemar-cli withholds stays withheld:
  a reserved DOI of an anonymous deposit is filtered by nemar-cli's server, and the registry has no second copy that could leak it.

## Alternatives considered

- **Put the non-dataset DOIs in nemar-cli:** its tables, its publication pipeline and its metadata gate are all shaped around a dataset,
  and its license (Creative Commons BY-NC-ND) does not suit a small registry others may copy.
  Rejected.
- **Copy the dataset DOIs into this registry:** thousands of records that change with every dataset version,
  a second copy that drifts, and a second implementation of nemar-cli's visibility rules.
  Rejected.
- **No registry, mint by hand in the EZID interface:** no review, no record of what was asked for and why, and nothing to list.
  Rejected.

## Receipts

- Owner direction of 2026-11-20, and question Q14 of the Request for Comments (RFC) program board in nemar-cli (`.context/rfc-program/board.md`).
- nemar-cli ADR 0007 (EZID is the sole DOI provider), `backend/src/services/doi.ts` and `ezid.ts` there.
- `https://api.datacite.org/dois?prefix=10.82901`, read on 2026-11-20: 2,556 records, none outside the `nemar.nm` and `nemar.on` suffixes.
