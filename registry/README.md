# The registry

One file per Digital Object Identifier (DOI) in `dois/`, named after the DOI's suffix, and the name table in `names.json`.
The format is described in [`docs/registry-format.md`](../docs/registry-format.md) and declared in [`src/schema.ts`](../src/schema.ts).

- Every DOI here is on the production shoulder `10.82901/nemar.`; a test DOI never is, and never lives here.
- A record in state `planned` is an announcement: nothing exists at EZID, and it must not be cited.
- From `reserved` on, a record is permanent: never deleted, never renamed, never pointed at something else.
- No dataset DOI is ever stored here; those belong to nemar-cli.

Change the registry only by pull request, and run `bun run validate` first.
