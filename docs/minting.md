# How a DOI is minted

A Digital Object Identifier (DOI) from this registry is permanent from the moment it exists at EZID.
This page is the procedure that gets it there.
The decisions are Architecture Decision Records (ADRs) 0004, 0005 and 0006, in [`.context/decisions/`](../.context/decisions/README.md).

**Nothing in this repository contacts EZID yet.**
Steps 4 to 6 describe a tool that is planned ([`.context/plan.md`](../.context/plan.md), phase 3); until it exists, no DOI is minted from here.

## Who does what

| Role      | Who                                              | Does                                            |
| --------- | ------------------------------------------------ | ----------------------------------------------- |
| Requester | a maintainer of the repository the DOI will name | opens the request                               |
| Reviewer  | a NEMAR administrator who is not the requester   | reads the record and approves the pull request  |
| Owner     | the NEMAR owner                                  | approves a new name, and approves each mint run |

## The steps

1. **Ask.**
   The requester opens an issue with the "DOI request" template.
   A release is requested after its tag exists; a line is requested together with its first release.
2. **Write the record.**
   A pull request adds `registry/dois/<suffix>.json` in state `planned` (and the name in `registry/names.json` if it is new).
   The format is in [`registry-format.md`](registry-format.md).
3. **Review.**
   Continuous integration runs `bun run validate` and `bun run transitions`.
   The reviewer checks what a machine cannot (the list below), then the pull request is merged.
   Merging mints nothing.
4. **Check that the record is ready.**
   `bun run validate --mint-ready <doi>` must pass, and so must the live checks:
   the `target` page answers 200 and shows this DOI, and the `source` tag exists and points at the recorded commit.
5. **Mint.**
   A manually started workflow, in a protected environment that the owner approves, takes one DOI and does this from the record on `main`:
   1. refuses unless the record is `planned`, ready, and on the production shoulder;
   2. builds the DataCite Extensible Markup Language (XML) document from the record, adding the derived version relations (ADR 0003);
   3. creates the identifier at EZID as `reserved`: `PUT /id/doi:10.82901/NEMAR.<SUFFIX>` with `_status`, `_target`, `_profile: datacite` and the `datacite` document;
   4. reads it back with `GET /id/...` and compares the target and the document with what it sent;
   5. makes it public: `POST /id/...` with `_status: public`;
   6. for a release, re-sends the document of its line and of the release before it, which now gain a relation.
6. **Record the result.**
   The run opens a pull request that sets the record to `public` and writes its `registered` block.
   The reviewer merges it after confirming that `https://doi.org/<doi>` resolves to the record's page.

## What the reviewer checks

- The DOI says what it names: the right name, the right version, a tag that really is that release.
- The title and the abstract describe the thing, in the words its authors would use.
- Every creator agreed to be listed, and each person is cited by the name they publish under, with their Open Researcher and Contributor ID (ORCID) iD if they have one.
  Nobody is cited by a login handle (nemar-cli ADR 0041).
- The license is the one in the source repository at that commit.
- The name, if new, is one NEMAR is willing to see in citations for good, and the owner has said so.
- Nothing in the record is confidential: the repository is public.

## Rules the tool will follow

- **EZID only**, at `ezid.cdlib.org`, with the DataCite profile (nemar-cli ADR 0007).
- **The identifier is derived from the record.**
  The tool uses `PUT /id/<identifier>`; it never uses `POST /shoulder/<shoulder>`, which asks EZID to invent a suffix.
- **It never deletes.**
  No code path sends `DELETE`, even for a reserved identifier (ADR 0004).
- **It is safe to run again.**
  If the identifier already exists, the tool reads it and continues from the state it finds; it never creates a second one.
- **Credentials follow the DOI.**
  A `10.5072/fk2` DOI uses EZID's test account; a `10.82901` DOI uses the registry's production account,
  which is available only to the protected environment (ADR 0006).
- **Every value sent to EZID is escaped.**
  EZID's request format needs `%`, line feeds and carriage returns percent-encoded,
  and forgetting it corrupts metadata silently (nemar-cli ADR 0007).
- **No unattended run.**
  The minting workflow starts only when a person starts it.
  No workflow triggered by a schedule, a push, a merge, a tag or another repository holds an EZID credential.

## Changing a registered DOI

- **Correcting metadata or the address:** a pull request edits the record; after it merges, the same approved workflow sends the change to EZID and updates `metadata_sha256`.
  A correction never changes what the DOI names.
- **Withdrawing:** a pull request sets the state to `unavailable` with a reason and a date; the workflow marks the identifier unavailable at EZID.
  The DOI then resolves to a tombstone on its page.
  Its record stays.
- **Reconciling:** a read-only check compares each registered record with EZID's public copy and reports any difference.
  It files nothing and repairs nothing; a person decides.

## Rehearsing

A rehearsal uses a `10.5072/fk2nemar.` DOI and EZID's test account, which is public and documented by EZID.
It proves the calls and the escaping.
It does not prove findability, because a test identifier is not sent to DataCite's production index,
so the first production mint is watched by the owner from start to finish.
