# nemar-doi plan

**Goal:** one registry of every Digital Object Identifier (DOI) NEMAR issues, with a page at doi.nemar.org that lists and resolves it.
**Owner direction:** 2026-11-20.
Dataset DOIs stay with nemar-cli; every other NEMAR DOI is registered here, first the releases of the biosig-zarr specification and of nemar-process.
**Stack:** TypeScript on Bun, Biome, Zod; the page as a Cloudflare Worker with static assets.

The verdicts are the Architecture Decision Records (ADRs) in [`decisions/`](decisions/README.md).
The detail is in [`docs/`](../docs/).
The facts this plan was built on are in [`research.md`](research.md).

## State on 2026-11-21

- No DOI has been minted from this repository, and no code here contacts EZID.
- The registry holds four planned records: `nemar.biosig-zarr.v2`, `nemar.biosig-zarr.v2.0.0`, `nemar.biosig-zarr.v3` and `nemar.process.v0`.
  None is minted; tag 2.0.0 of `nemarOrg/biosig-zarr` does not exist yet.
- ADR 0001 to 0008 are accepted.
  The owner accepted ADR 0002, 0003 and 0007 on 2026-11-21 and decided the credential question as ADR 0008.

## Phases

<!-- Status markers: [ ] pending, [~] in progress, [x] complete -->

### Phase 0: design and initialization

- [x] Repository created, initialized, licensed MIT
- [x] ADRs 0001 to 0008, the documents in `docs/`, the hard rules in `AGENTS.md`
- [x] The grammar, the record schema and the registry rules, with tests
- [x] The registry seeded with the planned records
- [ ] The owner reviews and merges the first pull request (the decisions below were answered on 2026-11-21)

### Phase 1: settle the design

- [x] The proposed ADRs become accepted (2026-11-21)
- [ ] `main` is protected (owner action 1)
- [ ] nemar-cli records the delegation, plans the `/dois` listing, and refuses any suffix that is not `nm` or `on` (owner action 5; nemar-cli issues 2281, 2282 and 2283)

### Phase 2: the page

- [ ] A build step turns `registry/` into static pages and `registry.json`
- [ ] The Worker: redirects, the lowercase rule, the dataset list read from nemar-cli
- [ ] Staging at doi-test.nemar.org from test-shoulder records, then production (owner action 3)

Gate: every address in [`docs/page.md`](../docs/page.md) answers as written, in a real Worker runtime, before production.

### Phase 3: the mint tool

- [ ] DataCite Extensible Markup Language (XML) built from a record, with the derived version relations, checked against DataCite's own schema
- [ ] An EZID client: create as reserved, read back, compare, make public; never delete; safe to run again
- [ ] A rehearsal on the EZID test shoulder, end to end, including a release that updates its line
- [ ] `mint.yml`: started by a person, one DOI, in the protected environment (owner action 2); it uses a dedicated GitHub App identity, a same-repository branch and one verified commit authored by the App, and it runs `transitions --allow-issue` itself (CI never allows issuance)
- [ ] A read-only reconcile of the registry against EZID

Gate: the rehearsal passes, and a second reviewer has read the client for the ways a request to EZID can be corrupted.
To verify in the rehearsal: EZID accepts the general resource type `Standard`, which DataCite added in schema 4.4.

### Phase 4: the first DOIs

- [ ] The request pull requests fill in the creators, year, abstract and license of the planned records
- [ ] The first mint, watched by the owner from start to finish (owner action 4)

## Decisions of the owner, 2026-11-21

All eight are settled.

1. **The grammar (ADR 0002): accepted.**
   `nemar.<name>.v<major>[.<minor>.<patch>]`, lowercase letters, digits and hyphens, and every letters-then-digits name left to nemar-cli.
2. **Lines and releases (ADR 0003): accepted.**
   The major line is the concept DOI, each release is a version DOI, a draft gets no DOI, and the bare name is reserved.
3. **biosig-zarr version 2: accepted.**
   Register `nemar.biosig-zarr.v2` and `nemar.biosig-zarr.v2.0.0` first, since they name something that exists.
   Version 3 waits until RFC-0001 is accepted and 3.0.0 is released.
4. **Where nemar-process starts: accepted.**
   The `nemar.process.v0` line, with the first DOI at the first tagged release.
5. **Where a non-dataset DOI resolves (ADR 0007): accepted.**
   Its page on doi.nemar.org, so the page goes to production before the first mint.
6. **Who holds the EZID credential: replaced (ADR 0008).**
   There is no separate EZID user and nothing to request from EZID.
   NEMAR's one existing credential goes into the protected environment `ezid-production`, whose runs the owner approves.
   nemar-cli mints only `nm` and `on` dataset suffixes and nemar-doi mints everything else, each side refusing the other's space in code.
7. **Who the creators are: accepted.**
   The people named in the source repository's `CITATION.cff` at the tagged commit, each by real name with an Open Researcher and Contributor ID (ORCID) iD; an organization only where no person can be named.
8. **How the page is deployed: accepted.**
   By hand the first time; afterwards a workflow on a merge to `main`, with a Cloudflare token limited to this one Worker.
   That workflow holds no EZID credential.

## Open questions

- Whether nemar-cli's EZID client can be reused.
  nemar-cli is licensed Creative Commons BY-NC-ND and this repository is MIT; the copyright holder is the same, so the owner can allow it, and otherwise phase 3 writes a small client of its own.
- Whether the registry should later hold DOIs for things beyond specifications and software (a report, a schema, a trained model).
  Each is a new kind in `src/schema.ts` and a name in the table; none is planned.
