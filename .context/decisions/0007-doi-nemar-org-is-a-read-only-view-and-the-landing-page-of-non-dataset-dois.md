# ADR 0007: doi.nemar.org is a read-only view of the registry and the landing page of non-dataset DOIs

**Status:** proposed
**Date:** 2026-11-20
**Owner:** Seyed Yahya Shirazi

## Context

The owner asked for a dedicated page at doi.nemar.org that lists and resolves the registry.
Two things have to be settled before the first Digital Object Identifier (DOI), because they end up inside its DataCite record:
where a non-dataset DOI resolves, and whether the page is a second resolver beside doi.org.
A dataset DOI already resolves to `nemar.org/dataset/<id>`, a page NEMAR controls.

## Decision

- **The page only reads.**
  It is built from the records on `main`, it holds no credential, and it has no way to change the registry or EZID.
- **It lists both halves.**
  Records this registry owns come from its files, in every state, with a planned one marked as not yet a DOI.
  Dataset DOIs are fetched from nemar-cli's public interface when the page is asked for them, and are never stored (ADR 0001).
- **It is the landing page of every non-dataset DOI.**
  `https://doi.nemar.org/10.82901/nemar.<name>.v<version>` is the address given to EZID.
  It shows the title, the creators, the state, the citation, the releases of a line, and a link to the thing itself,
  and it becomes the tombstone when a DOI is made unavailable.
- **doi.org stays the resolver.**
  Given a dataset-shaped DOI, the page redirects to `https://doi.org/<doi>` and looks nothing up.
- It is served as a Cloudflare Worker with static assets in the SCCN account, on a custom domain, like the other NEMAR sites.

The design is in [`docs/page.md`](../../docs/page.md).
Nothing is deployed and no Domain Name System (DNS) record exists yet.

## Consequences

- The page has to be live in production before the first DOI is minted, since a DOI must not resolve to nothing.
- The page's availability becomes part of resolving every non-dataset DOI, which is why it is static files and has no database.
- If doi.nemar.org is ever retired, every non-dataset DOI is pointed elsewhere.
  That is possible, because the address of a DOI can be changed, and it is the cost of this choice.
- A landing page under NEMAR's control survives a renamed repository or a moved specification site.
- When nemar-cli cannot be reached, the dataset list says so; the non-dataset DOIs keep resolving.

## Alternatives considered

- **Resolve to the release page on GitHub:** nothing to run, but the address belongs to someone else,
  shows no citation or DataCite metadata, and cannot become a tombstone.
  Rejected.
- **A section of nemar.org or of docs.nemar.org:** it ties a DOI's address to the release schedule and layout of a larger site,
  and the owner asked for a dedicated page.
  Rejected.
- **Keep a copy of the dataset DOIs so the page needs no other service:** see ADR 0001.
  Rejected.
- **Answer dataset DOIs from the page itself:** a second resolver that can disagree with doi.org.
  Rejected.

## Receipts

- Owner direction of 2026-11-20.
- `https://doi.org/10.82901/nemar.nm000103.v2.0.0` redirects to `https://nemar.org/dataset/nm000103?v=v2.0.0` (read on 2026-11-20).
- nemar-cli ADR 0008 (Cloudflare runs in the SCCN account only) and `backend/wrangler-sccn.toml` (custom domains).
