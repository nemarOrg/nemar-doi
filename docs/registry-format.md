# The registry format

The registry is the directory [`registry/`](../registry/).
It holds one name table and one file per Digital Object Identifier (DOI).
The shape of both is declared once, in [`src/schema.ts`](../src/schema.ts);
the JavaScript Object Notation (JSON) Schema files in [`schema/`](../schema/) are generated from it (`bun run schema`) for editors and for anyone outside this repository.
The decisions are Architecture Decision Records (ADRs) 0003 and 0004, in [`.context/decisions/`](../.context/decisions/README.md).

```
registry/
  names.json                        the names, the delegations, the reserved names
  dois/
    nemar.biosig-zarr.v3.json       one record: the file name is the DOI's suffix
    nemar.process.v0.json
```

## A record

```json
{
  "schema_version": 1,
  "doi": "10.82901/nemar.biosig-zarr.v3.0.0",
  "state": "public",
  "target": "https://doi.nemar.org/10.82901/nemar.biosig-zarr.v3.0.0",
  "source": {
    "repository": "nemarOrg/biosig-zarr",
    "tag": "3.0.0",
    "commit": "<the 40-character commit the tag points at>"
  },
  "datacite": { "...": "see below" },
  "registered": {
    "ezid_identifier": "doi:10.82901/NEMAR.BIOSIG-ZARR.V3.0.0",
    "reserved_at": "2027-01-15T18:02:11Z",
    "public_at": "2027-01-15T18:02:40Z",
    "metadata_sha256": "<SHA-256 of the DataCite XML last sent to EZID>"
  }
}
```

The example is an illustration; no such DOI exists.

| Field            | Meaning                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version` | `1`. A change to the shape of a record raises it.                                                                                       |
| `doi`            | The whole DOI in lowercase. It is the only statement of the name, the level and the version: none of them is repeated in another field. |
| `state`          | `planned`, `reserved`, `public` or `unavailable`.                                                                                       |
| `target`         | Where the DOI resolves, given to EZID as `_target`. It is the record's page on doi.nemar.org (ADR 0007).                                |
| `source`         | What the DOI names. A line names a repository. A release also names the tag and the commit the tag points at.                           |
| `datacite`       | The descriptive metadata, in DataCite's JSON spelling.                                                                                  |
| `registered`     | What exists at EZID. Written by the mint run, present from `reserved` on, absent on a planned record.                                   |
| `unavailable`    | `since` and `reason`. Present exactly when the state is `unavailable`.                                                                  |
| `note`           | Free text for people. It is not sent to EZID.                                                                                           |

## The DataCite block

The block uses the property names of the DataCite Metadata Schema as DataCite's own JSON writes them.
Only the properties below are accepted, and an unknown one is an error:
the minting code will turn exactly these into DataCite Extensible Markup Language (XML), so nothing a record says can be dropped on the way to EZID.

| Property                                         | Planned record                                                                  | Before minting                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `titles`                                         | required                                                                        | required                                                                  |
| `publisher`                                      | required, always `NEMAR (Neuroelectromagnetic Data Archive and Tools Resource)` | required                                                                  |
| `types` (`resourceTypeGeneral`, `resourceType`)  | required; the general type follows from the kind of the name                    | required                                                                  |
| `creators`                                       | optional                                                                        | required                                                                  |
| `publicationYear`                                | optional                                                                        | required                                                                  |
| `descriptions`                                   | optional                                                                        | required, with an `Abstract`                                              |
| `rightsList`                                     | optional                                                                        | required, with a Software Package Data Exchange (SPDX) license identifier |
| `subjects`, `contributors`, `relatedIdentifiers` | optional                                                                        | optional                                                                  |

A creator or contributor is a person or an organization.
A person has `givenName`, `familyName` and `name` written `familyName, givenName`, and may have one Open Researcher and Contributor ID (ORCID) iD.
There is no field a login handle could go in (nemar-cli ADR 0041).
An organization has a `name` and may have one Research Organization Registry (ROR) identifier.

`relatedIdentifiers` takes relations to other things: a specification `IsDocumentedBy` a page, a release `IsSupplementTo` a paper.
The version relations (`IsVersionOf`, `HasVersion`, `IsNewVersionOf`, `IsPreviousVersionOf`) are refused: they are derived when a DOI is minted (ADR 0003).
The DataCite `version` property is likewise derived from the DOI.

## States

```
planned --> reserved --> public <--> unavailable
```

| State         | At EZID                                        | In the registry                                        |
| ------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `planned`     | nothing                                        | an announcement; it may be changed, renamed or removed |
| `reserved`    | exists, does not resolve, not sent to DataCite | permanent from here on                                 |
| `public`      | resolves, findable in DataCite                 | permanent                                              |
| `unavailable` | resolves to a tombstone                        | permanent, with a reason                               |

From `reserved` on a record is never deleted or renamed, never returns to an earlier state, and never changes its `source`.
Its `target` and its descriptive metadata can still be corrected by pull request.
`bun run transitions <base>` compares the working tree with a base revision and fails on a change that breaks this; continuous integration runs it on every pull request.

## What the validator checks

`bun run validate` reads the registry and fails on any of these, each with the file and the reason:

- a file that is not the name table or a record under `dois/`;
- a record whose file name is not its suffix, whose DOI is not on the production shoulder, or whose DOI does not follow the grammar;
- a dataset-shaped name, a reserved name, or a name inside a delegated space;
- a name that is not declared, a `source.repository` that is not the name's repository, or a resource type that does not follow from its kind;
- a DOI with no version part;
- a release without its line in the registry, or registered before its line;
- a line that names a tag or a commit;
- a planned record with a `registered` block, or a record past `planned` without one or without the metadata a mint needs;
- an `unavailable` block that does not match the state.

`bun run validate --mint-ready <doi>` also lists what still stops a planned record from being minted.
Neither command contacts EZID or any network service.

## The name table

`registry/names.json` has three parts.

- `names`: each name with its `title`, `kind` and `repository`.
- `delegations`: suffix spaces whose registry of record is another system.
  Today there is one, the dataset space, delegated to nemar-cli; see [`delegation.md`](delegation.md).
- `reserved`: names nobody may be given.
