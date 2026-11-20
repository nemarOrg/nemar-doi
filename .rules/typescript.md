# TypeScript Standards

## Tools

- **Bun** runs, tests and installs. Never npm or npx.
- **Biome** lints and formats (`bun run lint`, `bun run format`). Never ESLint or Prettier.
- **TypeScript** is strict, with `noUncheckedIndexedAccess`; `bun run typecheck` must pass.
- Dependencies are pinned to exact versions, and each one needs a reason. Today there is one beyond the tools: Zod.

## Layout

```
src/doi.ts        the grammar of a Digital Object Identifier (DOI)
src/schema.ts     the shape of a record and of the name table (Zod); schema/ is generated from it
src/registry.ts   the rules across records, as pure functions over parsed files
scripts/          the commands: validate, transitions, schema
test/             bun:test, with a fixture registry on the EZID test shoulder
```

## Style

- Pure functions over parsed data wherever possible; the file system and git are touched at the edges only.
- Every object schema is strict. An unknown property is an error, never something to pass through.
- A rule is declared once. If a document has to restate it, the document links to the code and says the code is what runs.
- An error says which file and why, in a sentence a requester can act on.
- No `any`, no non-null assertion, no empty `catch`. A caught error is either reported or rethrown.
- A comment says why, not what. No commented-out code.
- No network call in `src/`, in the validator, or in a test.
  Code that talks to EZID belongs to phase 3 of the plan, in its own module, and is exercised against the test shoulder only.
