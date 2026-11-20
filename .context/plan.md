# nemar-doi plan

**Goal:** one registry of every Digital Object Identifier (DOI) NEMAR issues, with a page at doi.nemar.org that lists and resolves it.
**Owner direction:** 2026-11-20.
Dataset DOIs stay with nemar-cli; every other NEMAR DOI is registered here, first the releases of the biosig-zarr specification and of nemar-process.
**Stack:** TypeScript on Bun, Biome, Zod; the page as a Cloudflare Worker with static assets.

The verdicts are the Architecture Decision Records (ADRs) in [`decisions/`](decisions/README.md).
The detail is in [`docs/`](../docs/).
The facts this plan was built on are in [`research.md`](research.md).

## State on 2026-11-20

- No DOI has been minted from this repository, and no code here contacts EZID.
- The registry holds two planned records: `nemar.biosig-zarr.v3` and `nemar.process.v0`.
- ADR 0001, 0004, 0005 and 0006 are accepted: each is the owner's own instruction.
  ADR 0002, 0003 and 0007 are proposed: they are the planner's design and wait for the owner.

## Phases

<!-- Status markers: [ ] pending, [~] in progress, [x] complete -->

### Phase 0: design and initialization

- [x] Repository created, initialized, licensed MIT
- [x] ADRs 0001 to 0007, the documents in `docs/`, the hard rules in `AGENTS.md`
- [x] The grammar, the record schema and the registry rules, with tests
- [x] The registry seeded with the two planned records
- [ ] The owner reviews the first pull request and answers the decisions below

### Phase 1: settle the design

- [ ] The proposed ADRs become accepted, or are changed
- [ ] `main` is protected (owner action 1)
- [ ] nemar-cli records the delegation and plans the `/dois` listing (owner action 6)

### Phase 2: the page

- [ ] A build step turns `registry/` into static pages and `registry.json`
- [ ] The Worker: redirects, the lowercase rule, the dataset list read from nemar-cli
- [ ] Staging at doi-test.nemar.org from test-shoulder records, then production (owner action 4)

Gate: every address in [`docs/page.md`](../docs/page.md) answers as written, in a real Worker runtime, before production.

### Phase 3: the mint tool

- [ ] DataCite Extensible Markup Language (XML) built from a record, with the derived version relations, checked against DataCite's own schema
- [ ] An EZID client: create as reserved, read back, compare, make public; never delete; safe to run again
- [ ] A rehearsal on the EZID test shoulder, end to end, including a release that updates its line
- [ ] `mint.yml`: started by a person, one DOI, in the protected environment (owner actions 2 and 3)
- [ ] A read-only reconcile of the registry against EZID

Gate: the rehearsal passes, and a second reviewer has read the client for the ways a request to EZID can be corrupted.
To verify in the rehearsal: EZID accepts the general resource type `Standard`, which DataCite added in schema 4.4.

### Phase 4: the first DOIs

- [ ] The request pull requests fill in the creators, year, abstract and license of the planned records
- [ ] The first mint, watched by the owner from start to finish (owner action 5)

## Decisions for the owner

Each has a recommendation; none is settled.

1. **The grammar (ADR 0002).**
   `nemar.<name>.v<major>[.<minor>.<patch>]`, lowercase letters, digits and hyphens, and every letters-then-digits name left to nemar-cli.
   _Recommendation: accept._
2. **Lines and releases (ADR 0003).**
   The major line is the concept, each release is a version, a draft gets no DOI, and the bare name is reserved.
   _Recommendation: accept._
3. **biosig-zarr version 2.**
   Format version 2 is what NEMAR's stores use today, and it is being released as `2.0.0`.
   _Recommendation: yes, register `nemar.biosig-zarr.v2` and `nemar.biosig-zarr.v2.0.0` first, since they name something that exists; version 3 waits until it is accepted and released._
4. **Where nemar-process starts.**
   It was at 0.1.0 with no release tag on 2026-11-20.
   _Recommendation: the `nemar.process.v0` line, with the first DOI at the first tagged release, because a derivative's provenance should be able to cite the exact software that made it. The alternative is to wait for 1.0 and rename the planned record._
5. **Where a non-dataset DOI resolves (ADR 0007).**
   _Recommendation: its page on doi.nemar.org, which means the page goes to production before the first mint._
6. **Who holds the EZID credential (ADR 0005).**
   _Recommendation: a separate EZID user for this registry, in a protected GitHub environment that the owner approves for each run. Fallback, if EZID cannot provide one: mint through nemar-cli's backend._
7. **Who the creators are.**
   The planned records name none.
   _Recommendation: the people named in the source repository's citation file at the tagged commit, each by real name with an Open Researcher and Contributor ID (ORCID) iD, so the registry copies a list its authors already maintain; an organization only where no person can be named._
8. **How the page is deployed after the first time.**
   _Recommendation: the owner deploys by hand the first time; afterwards a workflow deploys on a merge to `main`, with a Cloudflare token limited to this one Worker. The page only reads, and a stale page blocks the next mint._

## Open questions

- Whether nemar-cli's EZID client can be reused.
  nemar-cli is licensed Creative Commons BY-NC-ND and this repository is MIT; the copyright holder is the same, so the owner can allow it, and otherwise phase 3 writes a small client of its own.
- Whether the registry should later hold DOIs for things beyond specifications and software (a report, a schema, a trained model).
  Each is a new kind in `src/schema.ts` and a name in the table; none is planned.
