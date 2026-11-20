# Editing the Registry

The registry is `registry/`: the name table and one record per Digital Object Identifier (DOI).
A change to it is how a permanent identifier comes to exist, so it is reviewed like code that cannot be rolled back.
The format is in `docs/registry-format.md`; the procedure is in `docs/minting.md`.

## Adding a request

- One pull request per DOI request, on a branch named `doi/<suffix>`.
  A line and its first release may share one.
- Add `registry/dois/<suffix>.json` in state `planned`.
  The file name is the DOI's suffix, in lowercase.
- A new name goes into `registry/names.json` in the same pull request and needs the owner's approval.
- Fill in what is known and true.
  Leave out what is not known yet; a planned record may be incomplete, and a guessed creator or license is worse than a missing one.
- Run `bun run validate` before pushing.

## Changing a record

- A `planned` record may be edited, renamed or removed.
- From `reserved` on, only the `target`, the descriptive metadata, the `note`, and a move between `public` and `unavailable` may change.
  Never the DOI, the file name, or the `source`.
- The `registered` block is written by the mint run.
  Never write one by hand to make a record look registered.
- Never add a version relation (`IsVersionOf`, `HasVersion`, `IsNewVersionOf`, `IsPreviousVersionOf`); they are derived.

## Never

- Never add a record on the production shoulder outside `registry/dois/`, or a test-shoulder record inside it.
- Never add a dataset DOI, or a file generated from nemar-cli's list of them.
- Never delete a record to "clean up", and never reuse the suffix of one.
- Never put anything confidential in a record: the repository is public from the first push.
