# nemar-doi: Development Instructions

> Project instructions for any coding agent and for people.
> Claude Code reads this through `@AGENTS.md` in `CLAUDE.md`.

nemar-doi is the registry of every Digital Object Identifier (DOI) NEMAR issues, and the source of the page at doi.nemar.org.
Dataset DOIs are delegated to nemar-cli; every other NEMAR DOI is one reviewed record in `registry/dois/`.
**This file is the hard rules**: what can go permanently wrong here and is not obvious from the code.
Explanation lives in [`docs/`](docs/), verdicts in [`.context/decisions/`](.context/decisions/README.md), and the phases in [`.context/plan.md`](.context/plan.md).

## Start with the decisions

Read the [decision index](.context/decisions/README.md) before you design or "fix" anything.
Where an Architecture Decision Record (ADR) and any other document disagree, the ADR wins.
Never delete an ADR; supersede it.
An ADR marked `proposed` is waiting for the owner: follow it, and do not build something expensive to undo on top of it.

## Hard rules

### A DOI is never deleted or reassigned (ADR 0004)

From the state `reserved` on, a record is permanent.
Do not delete or rename its file, move its state back, or change its `source` (repository, tag, commit).
Withdrawing something means the state `unavailable` with a reason; the DOI keeps resolving, to a tombstone.
No code may send EZID a `DELETE`, not even for a reserved identifier.
`bun run transitions <base>` enforces this on every pull request: do not weaken it, and do not work around it.

### A test DOI never uses the production shoulder (ADR 0006)

`10.82901/nemar.` appears in a record only under `registry/dois/`.
Everything made for a test, a rehearsal, a demonstration or staging is on the EZID test shoulder, written `10.5072/fk2nemar.<name>...`.
Never register or reserve a production name to try it out: there is no undo.

### Nothing mints without a reviewed record and a person's approval (ADR 0005)

A DOI is minted only from a record already merged to `main`, by a run that a person starts and the owner approves, one DOI at a time.
Do not add a workflow that can reach EZID from a schedule, a push, a merge, a tag or another repository.
Do not mint, reserve, update or query-with-credentials at EZID from an agent session, on either shoulder, unless the owner asked for exactly that.
**No code in this repository contacts EZID yet**; adding it is phase 3 of the plan and needs the owner's decisions first.

### Metadata is complete and reviewed before a DOI exists (ADR 0005)

A public DataCite record cannot be recalled, only amended.
`bun run validate --mint-ready <doi>` must pass, a person must have read the record, and its `target` must already answer.
A person is cited by given and family name, with an Open Researcher and Contributor ID (ORCID) iD where they have one, and never by a login handle.
Do not invent creators, abstracts, years or licenses to make a record pass: leave it `planned` and ask.

### Dataset DOIs are not ours (ADR 0001, ADR 0002)

A name that is letters followed only by digits (`nm000103`, `on009081`, any prefix, any width) belongs to nemar-cli.
Never issue one, never store a dataset DOI or a list of them in this repository, and never loosen `DATASET_SHAPED_NAME`.
The page reads dataset DOIs live from nemar-cli's public interface.

### EZID is the registrar

Not Zenodo, and not DataCite directly (nemar-cli ADR 0007).
A change made on the strength of Zenodo's or DataCite Fabrica's way of doing things is wrong here.
NEMAR has one EZID credential, shared with nemar-cli and kept only in the protected environment `ezid-production`, never in `ezid-test` (ADR 0008): nothing is requested from EZID, and the dataset guard above is the only thing between this registry and a dataset suffix.

### No secrets, no deploys, no domain changes

The repository is public.
No credential, token or `.env` file is ever committed, printed or pasted into an issue.
An agent does not deploy the Worker, does not change the Domain Name System (DNS), and does not create or change GitHub environments or secrets:
those are the owner's, and the exact steps are in [`docs/owner-actions.md`](docs/owner-actions.md).

### One declaration each

The grammar is [`src/doi.ts`](src/doi.ts); the shape of a record is [`src/schema.ts`](src/schema.ts); the rules across records are [`src/registry.ts`](src/registry.ts).
Change a rule there, with its test, and regenerate `schema/` with `bun run schema`.
Never hand-edit `schema/*.schema.json`, and never restate a rule in a second place that can drift.

## Tooling is fixed

**Bun** for TypeScript, never npm or npx.
**Biome** for lint and format, never ESLint or Prettier.
**uv** for anything Python, never pip or conda.
Wrangler runs only as `bunx cfman wrangler --account sccn <arguments>`, and only the owner deploys.

```bash
bun install
bun run validate      # the registry
bun run test          # everything, in well under a minute
bun run lint          # Biome
bun run typecheck
bun run schema        # after a change to src/schema.ts
```

## Workflow

1. Check the decision index and the plan; open an issue for anything that is more than a small fix.
2. Branch (`feature/...`, `fix/...`, or `doi/<suffix>` for a registry request); never commit to `main`.
3. Follow [`.rules/`](.rules/): `registry.md` for records, `typescript.md` for code, `testing.md` (no mocks), `git.md`, `code_review.md`, `ci_cd.md`, `documentation.md`.
4. Commit atomically: subjects under 50 characters, no emojis, no AI attribution.
5. Open a pull request; text posted to GitHub has one line per paragraph.
   Review it at most twice, with fixes on the same branch.
6. If the change settles something expensive to reverse, add or supersede an ADR in the same pull request, and add it to the index.

## Writing

American English.
No em-dashes.
Semantic line breaks in Markdown: one sentence per line, with a break at clause punctuation in a long sentence.
Define an abbreviation the first time a document uses it.

## Where everything else lives

- **Decisions:** [`.context/decisions/`](.context/decisions/README.md). A ruling; it binds.
- **Plan and research:** [`.context/plan.md`](.context/plan.md), [`.context/research.md`](.context/research.md), [`.context/scratch_history.md`](.context/scratch_history.md). Analysis; it informs.
- **Observations:** [`.memory/`](.memory/README.md), one fact per file. It binds nobody, and it never holds a secret or anything about a named person.
- **nemar-cli's decisions** are cited as "nemar-cli ADR NNNN" and live in `nemarOrg/nemar-cli` under `.context/decisions/`.
