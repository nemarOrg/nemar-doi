# Naming a NEMAR DOI

Every Digital Object Identifier (DOI) that NEMAR issues sits under one shoulder, `10.82901/nemar.`.
This page is the grammar of what follows the shoulder.
The decisions behind it are Architecture Decision Records (ADRs) 0002 and 0003 in [`.context/decisions/`](../.context/decisions/README.md);
the grammar itself is implemented once, in [`src/doi.ts`](../src/doi.ts), and where this page and that file disagree, the file is what runs.

## The grammar

```
doi      = "10.82901/nemar." name ".v" version
version  = major                          ; a line: the concept DOI
         | major "." minor "." patch      ; a release: the version DOI
name     = segment *( "-" segment )       ; 3 to 32 characters in all
segment  = 1*( letter | digit )           ; the first segment starts with a letter
letter   = "a" to "z"
major, minor, patch = "0" | a number with no leading zero
```

| Example                             | What it is                                               |
| ----------------------------------- | -------------------------------------------------------- |
| `10.82901/nemar.biosig-zarr.v3`     | the line: version 3 of the biosig-zarr format as a whole |
| `10.82901/nemar.biosig-zarr.v3.0.0` | a release: the text tagged `3.0.0`, at one commit        |
| `10.82901/nemar.biosig-zarr.v3.1.0` | the next release of the same line                        |
| `10.82901/nemar.process.v0`         | the line of nemar-process releases before 1.0            |
| `10.82901/nemar.biosig-zarr`        | reserved: the bare name is not issued                    |

## Characters and case

- A name uses lowercase letters, digits and single hyphens, and nothing else.
  There is no underscore, dot, slash, space or uppercase letter in a name.
- The dot is structure: it separates the namespace, the name and the parts of the version.
- A DOI is not case-sensitive.
  The registry, the page and every document write it in lowercase.
  EZID spells the same identifier `doi:10.82901/NEMAR.BIOSIG-ZARR.V3`; that form is derived by `ezidIdentifier` and never typed by hand.
- A version has no pre-release or build part, so `3.0.0-draft.1` cannot be written as a DOI.
  A release tag may or may not start with `v` in its own repository; the DOI always has `.v`.

## Lines and releases

|                                      | Line                                                                  | Release                                                        |
| ------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Suffix                               | `nemar.<name>.v<major>`                                               | `nemar.<name>.v<major>.<minor>.<patch>`                        |
| Names                                | a major version as a whole                                            | one tagged release, at one commit                              |
| Changes over time                    | gains releases                                                        | never                                                          |
| DataCite relations (derived at mint) | `HasVersion` each public release; `IsNewVersionOf` the line before it | `IsVersionOf` its line; `IsNewVersionOf` the release before it |
| Registered                           | together with its first release                                       | after its line                                                 |

The version relations are never written in a record.
They are computed from the registry when a DOI is minted, so they cannot disagree with it.

## How a collision with a dataset DOI is prevented

nemar-cli mints `10.82901/nemar.<dataset id>` and `10.82901/nemar.<dataset id>.v<version>`,
where a dataset id is two letters and six digits.
This registry treats a wider shape as taken: **any name that is letters followed only by digits**, whatever the letters and however many digits.
`nm000103`, `on009081`, `xx099900` and `abc1234567` are all refused, and so is `eeg2` (write `eeg-2`).

The two grammars are disjoint languages.
No suffix nemar-cli can produce is a suffix this registry can produce, so neither needs to ask the other before minting,
and the rule survives a new dataset prefix or a wider id.
[`test/doi.test.ts`](../test/doi.test.ts) pins it, and `registry/names.json` records the delegated shape as data so the page can show it.

## Getting a name

A name is declared in [`registry/names.json`](../registry/names.json) before any DOI uses it:
its title, its kind (`specification` or `software`), and the repository it lives in.
A new name needs the owner's approval, because it will be in every citation for good and cannot follow a renamed repository.
Names in the `reserved` list of that file are never given out.

The kind of a name fixes the DataCite general resource type of its DOIs:

| Kind            | `resourceTypeGeneral` |
| --------------- | --------------------- |
| `specification` | `Standard`            |
| `software`      | `Software`            |

A new kind is a change to `KIND_RESOURCE_TYPE` in [`src/schema.ts`](../src/schema.ts), reviewed like any other.

## Test DOIs

A DOI made for a test or for the staging page is on the EZID test shoulder and is written `10.5072/fk2nemar.<name>.v<version>`.
It follows the same grammar after the shoulder.
A test DOI never uses `10.82901` (ADR 0006).
