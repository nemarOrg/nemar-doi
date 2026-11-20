# Owner actions

What only the NEMAR owner can do, in the order it is needed, as exact steps.
None of it has been done, and no agent does any of it: an agent does not create credentials, deploy, or change the Domain Name System (DNS).
The decisions that come before these actions are listed in [`.context/plan.md`](../.context/plan.md).

## 1. Protect `main` (now)

Give the administrators team write access, so that `.github/CODEOWNERS` can require its review, then add the rule set:

```bash
gh api -X PUT orgs/nemarOrg/teams/admins/repos/nemarOrg/nemar-doi -f permission=maintain

gh api -X POST repos/nemarOrg/nemar-doi/rulesets --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "require_code_owner_review": true,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "check" }]
      }
    }
  ]
}
JSON
```

The reviewer of a request must not be its author (Architecture Decision Record (ADR) 0005), so the team needs at least two people who can review.

## 2. Ask EZID for a separate user (before phase 3)

EZID lets an identifier be updated only by the user that owns it, by a proxy of that user, or by an administrator of its group.
A second user is therefore a real boundary: a fault in this repository could not rewrite a dataset Digital Object Identifier (DOI).

1. Write to EZID support through `https://ezid.cdlib.org/contact` and ask for:
   - a second user in NEMAR's EZID group (suggested name `nemar-registry`), allowed to create identifiers on the shoulder `doi:10.82901/NEMAR.`;
   - that user to be neither a group administrator nor a proxy of the existing user;
   - confirmation that it then cannot update or delete identifiers the existing user owns.
2. In the same message, repeat the open request about the DataCite client (nemarOrg/website#288):
   a client of NEMAR's own for the prefix `10.82901`, or at least the re3data identifier `10.17616/R31NJN95` on the shared client `cdl.ucsd`.
   Every DOI from this registry inherits the same "Unknown Repository" attribution until that is fixed.
3. If EZID cannot provide a second user, say so in an issue here.
   The fallback in ADR 0005 is to mint through nemar-cli's backend, and that is a design change, not a workaround.

## 3. Store the credential (before phase 3)

Keep the new user's name and password in Infisical, in a folder of its own for nemar-doi.
Then create the protected environment and give it the two secrets.
`gh secret set` prompts for the value; never put a value on the command line or in a file in this repository.

```bash
OWNER_ID=$(gh api user -q .id)

gh api -X PUT repos/nemarOrg/nemar-doi/environments/ezid-production --input - <<JSON
{
  "reviewers": [{ "type": "User", "id": ${OWNER_ID} }],
  "deployment_branch_policy": { "protected_branches": true, "custom_branch_policies": false }
}
JSON

gh secret set EZID_USERNAME --env ezid-production --repo nemarOrg/nemar-doi
gh secret set EZID_PASSWORD --env ezid-production --repo nemarOrg/nemar-doi
```

The environment makes every mint run wait for the owner's approval and limits it to the protected branch.
The EZID test account needs no protection; it goes in a second environment, `ezid-test`, the same way, when the rehearsal in phase 3 needs it.

## 4. Deploy the page (phase 2, after its pull request merges)

Measured on 2026-11-20: `doi.nemar.org` has no DNS record, and the `nemar.org` zone is served by Cloudflare.
The Worker's configuration will declare both names as custom domains, so the first deploy creates the DNS record and the certificate.
There is no separate DNS step, and nothing to do in the dashboard.

```bash
cd /path/to/nemar-doi
bun install
bun run build

bunx cfman wrangler --account sccn deploy --env dev     # staging: doi-test.nemar.org
curl -sI https://doi-test.nemar.org/ | head -1          # expect 200

bunx cfman wrangler --account sccn deploy               # production: doi.nemar.org
dig +short doi.nemar.org
curl -sI https://doi.nemar.org/ | head -1               # expect 200
```

`bun run build` and the Worker configuration do not exist yet; phase 2 adds them.
Do not mint anything until the production page answers.

## 5. Approve each mint (phase 4)

For each DOI, after its request has merged and its page is live:

```bash
bun run validate --mint-ready 10.82901/nemar.<name>.v<version>
gh workflow run mint.yml --repo nemarOrg/nemar-doi -f doi=10.82901/nemar.<name>.v<version>
```

Approve the run when GitHub asks, watch it finish, check that `https://doi.org/<doi>` resolves to the record's page,
then review and merge the pull request the run opens.
`mint.yml` does not exist yet; phase 3 adds it.

## 6. In nemar-cli

- Record the delegation there (a short ADR or a line in its documentation that names ADR 0001 of this repository).
- Add the public `/dois` listing described in [`delegation.md`](delegation.md).
- Add a test that every suffix nemar-cli can mint is dataset-shaped.
