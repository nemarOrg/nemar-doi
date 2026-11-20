# The page at doi.nemar.org

doi.nemar.org lists every Digital Object Identifier (DOI) NEMAR issues and is the landing page of the ones that do not name a dataset.
The decision is Architecture Decision Record (ADR) 0007, in [`.context/decisions/`](../.context/decisions/README.md).
**Nothing is built or deployed yet**; this page is the design for phase 2 of [`.context/plan.md`](../.context/plan.md).

## Addresses

| Address                                                       | Answer                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                                                           | the registry: the names, their lines and releases with their states, then the dataset DOIs  |
| `/10.82901/nemar.<name>.v<version>`                           | the landing page of one record                                                              |
| `/nemar.<name>.v<version>`                                    | redirect to the address above                                                               |
| `/10.82901/nemar.<dataset id>...`                             | redirect to `https://doi.org/<doi>`; nothing is looked up                                   |
| `/datasets?offset=<n>`                                        | the dataset DOIs, read from nemar-cli when asked                                            |
| `/registry.json`                                              | every record of this registry in one document, with the name, level and version spelled out |
| `/10.82901/nemar.<name>.v<version>.json`                      | one record                                                                                  |
| `/schema/doi-record.schema.json`, `/schema/names.schema.json` | the schema files, in JSON Schema (JavaScript Object Notation)                               |

An address is matched without regard to case and answered in lowercase.
A suffix that follows the grammar but has no record answers 404 and says the DOI does not exist.

## A landing page

A record's page shows, from the record and nothing else:

- the DOI as a `https://doi.org/` link, and its state;
- the title, the creators with their Open Researcher and Contributor ID (ORCID) iDs, the publisher, the year, the license and the abstract;
- what it names: the repository, and for a release the tag and the commit, each as a link;
- for a line, its releases, newest first, and the lines before and after it; for a release, its line;
- a citation to copy, and the DataCite metadata as JSON;
- machine-readable metadata in the page (schema.org JSON-LD) so that indexers read the same facts.

Two states change the page:

- **`planned`** shows a clear notice that this is not a DOI yet, does not resolve, and must not be cited.
- **`unavailable`** is the tombstone: the reason, the date, and the metadata, with no link to content.

## The dataset list

The page does not store dataset DOIs.
When a visitor asks for them, the Worker fetches one page from nemar-cli's public interface
(the catalog call today, the `/dois` listing when it exists; see [`delegation.md`](delegation.md)), caches it at the edge for a few minutes, and renders it.
Each row links to `https://doi.org/<doi>`.
The section says that these DOIs are registered by nemar-cli, with the count nemar-cli reports.
If the call fails, the section says the list is unavailable right now; it does not show an empty list or an old copy as if it were current.

## How it is served

- One Cloudflare Worker with static assets, in the SCCN account (nemar-cli ADR 0008), like docs.nemar.org.
- A build step turns `registry/` into the static pages and `registry.json`.
  The Worker script handles only what files cannot: the redirects, the lowercase rule and the dataset list.
- No database, no secret, no binding that can write anywhere.
  The Worker cannot reach EZID with a credential and has no route that changes anything.
- Production is `doi.nemar.org`; staging is `doi-test.nemar.org`, built from test-shoulder records, and labeled as staging on every page.
- Both names are declared as custom domains in the Worker's configuration, so Cloudflare creates the Domain Name System (DNS) record and the certificate on the first deploy.
  A deploy is therefore also the DNS change, and it is the owner's act ([`owner-actions.md`](owner-actions.md)).
- Wrangler runs only as `bunx cfman wrangler --account sccn ...`.

## Order of work

The page goes to production before the first DOI is minted, because a DOI's address must already answer.
After that, a merged change to `registry/` is deployed before the mint run that depends on it:
the mint tool checks that the address answers and shows the DOI, so the order cannot be skipped by accident.
