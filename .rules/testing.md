# Testing Standards

## No mocks

A test runs the real code on real inputs, or it is not written.
No mock objects, no stubbed functions, no fake return values standing in for logic.

- The registry rules are pure functions, so their real inputs are files:
  `test/fixtures/registry/` is a small registry read from disk, and each refusal test changes exactly one thing in it.
- The commands are tested by running them (`Bun.spawn`) against this repository.
- A test that needs git uses real git.
- Code that will talk to EZID is tested against EZID's test shoulder or against a local server that speaks EZID's protocol and records what it was sent.
  It is never tested by replacing the client with a mock, and never against the production shoulder.

## What a test must be able to do

- **Fail.** After writing a refusal test, break the rule in the source and watch the test fail, then restore it.
  A rule whose test survives its removal is not tested.
- **Fail for one reason.** Start from the valid fixture, so a refusal can only come from the one change the test made.
- **Push in the dangerous direction.** Test that a registered Digital Object Identifier (DOI) cannot be deleted, rewound or reassigned, not only that a valid change is accepted.

## Running

```bash
bun run test                    # everything
bun test test/doi.test.ts       # one file
```

The suite uses no network and takes well under a minute, so run all of it.

## Fixtures

Every DOI in a fixture is on the test shoulder, `10.5072/fk2nemar.`.
A fixture never uses `10.82901`, and none of them was ever sent to EZID.
