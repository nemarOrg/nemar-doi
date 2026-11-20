# Test fixtures

`registry/` is a small registry the tests read from disk.
Every DOI in it is spelled on the EZID test shoulder (`10.5072/fk2`), and none of them was ever sent to EZID:
the `registered` blocks are inputs for the validator, not evidence of a mint.
A fixture never uses the production shoulder (ADR 0006).
