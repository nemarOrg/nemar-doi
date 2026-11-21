# nemar-doi

The registry of every Digital Object Identifier (DOI) that [NEMAR](https://nemar.org) issues, and the source of the page at doi.nemar.org.

NEMAR issues DOIs under the prefix `10.82901`, through EZID.

- **Dataset DOIs** (`10.82901/nemar.nm000103`, `10.82901/nemar.on009081`, and a DOI for each version) are minted and recorded by
  [nemar-cli](https://github.com/nemarOrg/nemar-cli) when a dataset is published.
  This repository lists them and holds no copy of them.
- **Every other NEMAR DOI** is registered here: one reviewed record per DOI, in [`registry/dois/`](registry/dois/).
  The first ones planned are the releases of the [biosig-zarr](https://github.com/nemarOrg/biosig-zarr) specification
  and of [nemar-process](https://github.com/nemarOrg/nemar-process).

## Status

This is the design and the registry format.
**No DOI has been minted from this repository**, nothing here contacts EZID, and doi.nemar.org is not deployed yet.
The four records in the registry are `planned`: they announce a name and are not DOIs.

## A DOI from this registry

```
10.82901/nemar.biosig-zarr.v3          version 3 of the format as a whole (the concept)
10.82901/nemar.biosig-zarr.v3.0.0      one release of it, at one commit (a version)
```

A DOI registered here is never deleted and never pointed at something else.

## Documents

|                                                       |                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| [`docs/naming.md`](docs/naming.md)                    | the grammar of a DOI, and why it cannot collide with a dataset DOI |
| [`docs/registry-format.md`](docs/registry-format.md)  | a record, its states, and what the validator checks                |
| [`docs/delegation.md`](docs/delegation.md)            | what belongs to nemar-cli and how the page lists it                |
| [`docs/minting.md`](docs/minting.md)                  | how a DOI is requested, reviewed and minted                        |
| [`docs/page.md`](docs/page.md)                        | the design of doi.nemar.org                                        |
| [`docs/owner-actions.md`](docs/owner-actions.md)      | what only the NEMAR owner can do, as exact steps                   |
| [`.context/decisions/`](.context/decisions/README.md) | the decisions and their reasons                                    |
| [`.context/plan.md`](.context/plan.md)                | the phases and the open decisions                                  |

## Asking for a DOI

Open an issue with the "DOI request" template.
A DOI is for a released, tagged thing that NEMAR publishes; read [`docs/minting.md`](docs/minting.md) first.
To get a DOI for a dataset, publish the dataset through NEMAR instead.

## Working on the registry

The tools are [Bun](https://bun.sh) and [Biome](https://biomejs.dev).

```bash
bun install
bun run validate                # check every record in registry/
bun run validate --mint-ready 10.82901/nemar.biosig-zarr.v3
bun run transitions origin/main # no registered DOI is deleted, rewound or reassigned
bun run test
bun run lint && bun run typecheck
bun run schema                  # regenerate schema/*.schema.json from src/schema.ts
```

None of these commands uses the network.
Rules for people and coding agents are in [`AGENTS.md`](AGENTS.md).

## License

MIT; see [`LICENSE`](LICENSE).
