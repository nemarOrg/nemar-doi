# Documentation Standards

## Where a statement belongs

| Kind                             | Place                                                          |
| -------------------------------- | -------------------------------------------------------------- |
| A ruling and why                 | an Architecture Decision Record (ADR) in `.context/decisions/` |
| How something works or is done   | `docs/`                                                        |
| What can go permanently wrong    | the hard rules in `AGENTS.md`, a few lines each, with a link   |
| What is planned or being weighed | `.context/plan.md`                                             |
| What was measured                | `.context/research.md`, with the date and how                  |
| A passing observation            | `.memory/`, one fact per file                                  |

Say a thing once.
A second copy drifts, so the other places link to the first.
Where a document describes a rule that code enforces, it names the file and says the code is what runs.

## Style

- American English.
- No em-dashes; a comma, a semicolon or a new sentence does the work.
- Semantic line breaks: one sentence per line, and a break at clause punctuation in a long sentence.
  Blank lines separate paragraphs only.
- Text posted to GitHub (issues, pull requests, comments) is the exception: one line per paragraph, because GitHub renders every newline as a break.
- Define an abbreviation the first time a document uses it.
- Write a Digital Object Identifier (DOI) in lowercase.
- Say "planned" for a record that is not a DOI yet, and never show a planned DOI as a link to doi.org.
- An example DOI that does not exist says so.
- State what was measured and when; do not write "should" about something that can be checked.
