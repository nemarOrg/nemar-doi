# nemar-doi research notes

What was measured before the design was written, with the date and how.
These are observations, not rulings; the rulings are in [`decisions/`](decisions/README.md).

## NEMAR's existing DOIs (2026-11-20)

- nemar-cli mints through EZID on the shoulder `doi:10.82901/NEMAR.` and uses `doi:10.5072/FK2` for tests
  (`backend/src/services/ezid.ts`: `PRODUCTION_SHOULDER`, `TEST_SHOULDER`).
- A dataset's concept Digital Object Identifier (DOI) is `doi:10.82901/NEMAR.<DATASET ID>` and a version DOI appends `.V<version>`
  (`backend/src/services/doi.ts`: `buildConceptIdentifier`, `buildVersionIdentifier`).
  Both are created with `PUT /id/<identifier>`, so the suffix is chosen by NEMAR, not by EZID.
- nemar-cli stores them in its database: `datasets.concept_doi`, `datasets.latest_version_doi`, `dataset_versions.doi`.
  The EZID identifier is derived from the DOI, not stored.
- `https://api.datacite.org/dois?prefix=10.82901` reported 2,556 DOIs.
  A query for any DOI under the prefix not starting with `nemar.nm` or `nemar.on` returned none.
- `https://api.datacite.org/prefixes/10.82901`: the prefix belongs to the DataCite client `cdl.ucsd` only.
- `https://doi.org/10.82901/nemar.nm000103.v2.0.0` redirects to `https://nemar.org/dataset/nm000103?v=v2.0.0`,
  and the uppercase spelling resolves the same way.
- The publisher on a registered dataset DOI is `NEMAR (Neuroelectromagnetic Data Archive and Tools Resource)`.

## nemar-cli's public interface (2026-11-20)

- `GET https://api.nemar.org/datasets?has_doi=true&limit=1` answers without credentials, with `concept_doi` per dataset and `total_count: 910`.
- `GET https://api.nemar.org/datasets/nm000103` adds `latest_version_doi` and `latest_version`.
- `GET https://api.nemar.org/datasets/nm000103/versions` answers 401.

## EZID (2026-11-20, `https://ezid.cdlib.org/doc/apidoc.html`)

- An identifier may be updated only by its owner, a proxy of its owner, or an administrator of its group.
- Only a reserved identifier can be deleted.
- A DataCite Extensible Markup Language (XML) document is bound to an identifier through the `datacite` element with the `datacite` profile.

## The things to be named (2026-11-20)

- `nemarOrg/biosig-zarr` exists and holds only a README; no tag yet.
  The program plan in nemar-cli tags `2.0.0` for format version 2 and keeps version 3 on a draft branch until its Request for Comments is accepted.
- `nemarOrg/nemar-process` is at version 0.1.0 in `pyproject.toml`, with no release tag; its release tags will be `vX.Y.Z`.

## doi.nemar.org (2026-11-20)

- `dig +short doi.nemar.org` returns nothing: the name has no record.
- The `nemar.org` zone is served by Cloudflare name servers.
- docs.nemar.org is a Cloudflare Worker with static assets; nemar-cli's Workers use `custom_domain = true` routes in the SCCN account.
