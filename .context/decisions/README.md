# Architecture Decision Records

Architecture Decision Records (ADRs) capture significant decisions that shape the project: choice of stack, structural patterns, trade-offs accepted, alternatives rejected. Tuck them all in here so they are easy to find later.

## Convention

- One file per decision: `NNNN-short-kebab-title.md`, zero-padded to four digits.
- `0000-template.md` is the template; copy it to start a new ADR. Do not edit `0000-template.md` itself.
- Number sequentially. The next ADR after `0008-...` is `0009-...`.
- Status flows `proposed` -> `accepted` -> (later) `superseded by ADR NNNN`. Never delete an ADR; supersede it.
- A `proposed` ADR is the planner's design waiting for the owner. Follow it, and do not build anything that would be expensive to undo on it until it is `accepted`.
- Where an ADR and any other document here disagree, the ADR wins.
- An ADR of nemar-cli is cited as "nemar-cli ADR NNNN"; they live in `nemarOrg/nemar-cli` under `.context/decisions/`.
- Keep each ADR short. If it grows past two screens, you are probably writing a design doc, not a decision.

## When to write an ADR

Write one when a decision:

- Will be hard or expensive to reverse.
- Cuts off other reasonable paths a future contributor might wonder about.
- Has been argued about more than once.
- Embeds a constraint (legal, performance, schedule) that is not obvious from the code.

Do not write one for routine choices that are obvious from reading the code.

## Index

`test/repository.test.ts` fails when this list and the files disagree.

- [ADR 0001](0001-nemar-doi-registers-every-doi-and-dataset-dois-stay-with-nemar-cli.md) - nemar-doi is the registry of every NEMAR DOI, and dataset DOIs stay with nemar-cli
- [ADR 0002](0002-a-doi-suffix-is-nemar-name-version-and-dataset-shaped-names-are-never-issued.md) - A DOI suffix is `nemar.<name>.v<version>`, and a dataset-shaped name is never issued here
- [ADR 0003](0003-a-major-line-is-the-concept-doi-and-each-release-is-a-version-doi.md) - A major line is the concept DOI and each release is a version DOI
- [ADR 0004](0004-the-registry-is-one-file-per-doi-and-a-registered-doi-is-never-deleted-or-reassigned.md) - The registry is one file per DOI, and a registered DOI is never deleted or reassigned
- [ADR 0005](0005-a-doi-is-minted-from-a-reviewed-record-by-a-run-a-person-approves.md) - A DOI is minted only from a reviewed record, by a run a person approves
- [ADR 0006](0006-a-test-doi-never-uses-the-production-shoulder.md) - A test DOI never uses the production shoulder
- [ADR 0007](0007-doi-nemar-org-is-a-read-only-view-and-the-landing-page-of-non-dataset-dois.md) - doi.nemar.org is a read-only view of the registry and the landing page of non-dataset DOIs
- [ADR 0008](0008-one-ezid-credential-split-by-policy-nemar-cli-mints-datasets-nemar-doi-the-rest.md) - One EZID credential, split by policy: nemar-cli mints datasets, nemar-doi mints everything else
