# The delegation to nemar-cli

Dataset Digital Object Identifiers (DOIs) belong to nemar-cli (Architecture Decision Record (ADR) 0001, in [`.context/decisions/`](../.context/decisions/README.md)).
nemar-cli mints one concept DOI per dataset and one version DOI per dataset release, and records them in its own database.
This registry holds no dataset DOI, in any form: no record, no generated list, no cache committed to the repository.

## What is delegated

Every suffix whose name is dataset-shaped: letters followed only by digits (see [`naming.md`](naming.md)).
Today that is the `nm` prefix (datasets submitted to NEMAR) and the `on` prefix (mirrors of OpenNeuro datasets),
and it covers any prefix or id width nemar-cli adopts later.
The delegation is recorded as data in [`registry/names.json`](../registry/names.json) so the page can state it.

|                         | Dataset DOIs                            | Every other NEMAR DOI                           |
| ----------------------- | --------------------------------------- | ----------------------------------------------- |
| Registry of record      | nemar-cli (its database)                | this repository (`registry/dois/`)              |
| Minted by               | nemar-cli's backend, on publication     | a run a person approves, from a reviewed record |
| Metadata gate           | nemar-cli ADR 0018 (automated)          | ADR 0005 (a person)                             |
| Listed at doi.nemar.org | live, from nemar-cli's public interface | from this repository's files                    |
| Resolves to             | `nemar.org/dataset/<id>`                | `doi.nemar.org/<doi>`                           |

## What nemar-cli exposes today

Measured on 2026-11-20, without credentials:

- `GET https://api.nemar.org/datasets?has_doi=true&limit=<n>&offset=<n>` returns each public dataset with its `concept_doi`,
  and `total_count` (910 that day).
- `GET https://api.nemar.org/datasets/<id>` adds `latest_version_doi` and `latest_version`.
- The list of a dataset's version DOIs is not public: `GET /datasets/<id>/versions` answers 401.

That is enough for the first version of the page: it lists the concept DOIs and links each one to its dataset page, where the versions are.

## What the registry asks nemar-cli for

One public, read-only, anonymous listing of the DOIs nemar-cli has made public, so the page does not have to walk a catalog built for another purpose.
This is a request for a change in nemar-cli, and it is nemar-cli's to design; the page needs no more than this:

```
GET https://api.nemar.org/dois?limit=<n>&offset=<n>

{
  "total_count": 2556,
  "dois": [
    {
      "doi": "10.82901/nemar.nm000103.v2.0.0",
      "kind": "version",                       // or "concept"
      "dataset_id": "nm000103",
      "version": "2.0.0",                      // null for a concept
      "title": "...",
      "state": "public",                       // or "unavailable"
      "registered_at": "2026-02-23T07:49:00Z"
    }
  ]
}
```

- Sorted by DOI, so paging is stable.
- Filtered by nemar-cli's server exactly as its catalog is (nemar-cli ADR 0017):
  a private dataset and the reserved DOI of an anonymous deposit (nemar-cli ADR 0065) never appear.
  The registry does no filtering of its own and must never be given something it would have to hide.
- Safe to cache for a few minutes.

Until that endpoint exists the page uses the catalog call above.

## What each side promises

- **nemar-doi** never issues a dataset-shaped suffix, never stores a dataset DOI,
  and never asks EZID about a dataset DOI with its own credential.
- **nemar-cli** mints only dataset suffixes (`nemar.nm…` and `nemar.on…`), refuses any other suffix before it calls EZID, and keeps the listing public and filtered.
  A test there that pins that shape, naming ADR 0002 and ADR 0008 of this repository, makes the promise mechanical (nemar-cli issue 2281).
  Both sides use the one EZID credential NEMAR holds, so these two guards are the boundary (ADR 0008).
- **A new kind of DOI** is decided here.
  If it names a dataset it is nemar-cli's; otherwise it gets a name in this registry.

## Resolving a dataset DOI at doi.nemar.org

The page answers a dataset-shaped DOI with a redirect to `https://doi.org/<doi>` and looks nothing up.
doi.org is the resolver, and it already knows where every dataset DOI goes.
