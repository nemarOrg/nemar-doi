/**
 * The transition check against real git history: a temporary repository holds a base commit
 * with registered records, each test makes one change in its working tree, and the real
 * script judges it. A check that only compared HEAD with HEAD could never fail.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ezidIdentifier } from "../src/doi";
import { checkTransitions, type Seen, transitionProblems } from "../src/transitions";

const root = join(import.meta.dir, "..");
const LINE_DOI = "10.5072/fk2nemar.sample-spec.v1";
const RELEASE_DOI = "10.5072/fk2nemar.sample-spec.v1.0.0";
const PLANNED_DOI = "10.5072/fk2nemar.sample-spec.v2";
const LINE = "registry/dois/fk2nemar.sample-spec.v1.json";
const RELEASE = "registry/dois/fk2nemar.sample-spec.v1.0.0.json";
const PLANNED = "registry/dois/fk2nemar.sample-spec.v2.json";

type Json = Record<string, unknown>;

async function run(cwd: string, ...command: string[]): Promise<{ code: number; output: string }> {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, output: out + err };
}

const NEXT_RELEASE_DOI = "10.5072/fk2nemar.sample-spec.v2.0.0";
const NEXT_RELEASE = "registry/dois/fk2nemar.sample-spec.v2.0.0.json";

let dir = "";

/** A base in which the planned line v2 has a planned first release, v2.0.0, as a request would add them. */
async function plannedPair(): Promise<void> {
  await cp(join(dir, RELEASE), join(dir, NEXT_RELEASE));
  await edit(NEXT_RELEASE, (json) => {
    json.doi = NEXT_RELEASE_DOI;
    json.target = `https://doi-test.nemar.org/${NEXT_RELEASE_DOI}`;
    json.state = "planned";
    delete json.registered;
    (json.source as Json).tag = "2.0.0";
  });
}

/** Take a planned record to public the way the mint run would: state and registered only. */
async function issue(path: string, doi: string): Promise<void> {
  const registered = JSON.parse(await readFile(join(dir, LINE), "utf8")).registered as Json;
  await edit(path, (json) => {
    json.state = "public";
    json.registered = { ...registered, ezid_identifier: ezidIdentifier(doi) };
  });
}

/** A repository whose base commit is the fixture registry: two public records and a planned one. */
async function baseRepo(prepare?: (dir: string) => Promise<void>): Promise<void> {
  await cp(join(root, "test", "fixtures", "registry"), join(dir, "registry"), { recursive: true });
  await prepare?.(dir);
  for (const command of [
    ["git", "init", "-q", "-b", "main"],
    ["git", "config", "user.email", "test@example.org"],
    ["git", "config", "user.name", "Test"],
    ["git", "config", "commit.gpgsign", "false"],
    ["git", "add", "."],
    ["git", "commit", "-q", "-m", "base"],
  ]) {
    const done = await run(dir, ...command);
    if (done.code !== 0) throw new Error(`${command.join(" ")}: ${done.output}`);
  }
}

async function edit(path: string, change: (json: Json) => void): Promise<void> {
  const json = JSON.parse(await readFile(join(dir, path), "utf8")) as Json;
  change(json);
  await writeFile(join(dir, path), `${JSON.stringify(json, null, 2)}\n`);
}

const judge = (...extra: string[]) =>
  run(root, "bun", "run", "scripts/check-transitions.ts", "HEAD", "--repo", dir, ...extra);

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "nemar-doi-transitions-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("the transitions script, on a repository with history", () => {
  test("an unchanged registry passes, and counts only registered records", async () => {
    await baseRepo();
    const result = await judge();
    expect(result.output).toContain("2 registered record(s)");
    expect(result.code).toBe(0);
  });

  test("a revision that does not exist is an error", async () => {
    await baseRepo();
    const result = await run(
      root,
      "bun",
      "run",
      "scripts/check-transitions.ts",
      "no-such",
      "--repo",
      dir,
    );
    expect(result.code).not.toBe(0);
  });

  test("a registered DOI edited in place is refused", async () => {
    await baseRepo();
    await edit(LINE, (json) => {
      json.doi = "10.5072/fk2nemar.sample-spec.v9";
      json.target = "https://doi-test.nemar.org/10.5072/fk2nemar.sample-spec.v9";
    });
    const result = await judge();
    expect(result.output).toContain(
      `${LINE_DOI} is public at EZID: its record is never deleted or renamed`,
    );
    expect(result.code).toBe(1);
  });

  test("a registered record renamed together with its DOI is refused", async () => {
    await baseRepo();
    await rename(join(dir, LINE), join(dir, "registry/dois/fk2nemar.sample-spec.v9.json"));
    await edit("registry/dois/fk2nemar.sample-spec.v9.json", (json) => {
      json.doi = "10.5072/fk2nemar.sample-spec.v9";
    });
    const result = await judge();
    expect(result.output).toContain(`${LINE_DOI} is public at EZID`);
    expect(result.code).toBe(1);
  });

  test("a registered record renamed without changing its DOI is refused", async () => {
    await baseRepo();
    await rename(join(dir, LINE), join(dir, "registry/dois/fk2nemar.sample-spec.v1-moved.json"));
    const result = await judge();
    expect(result.output).toContain("is never moved or renamed");
    expect(result.code).toBe(1);
  });

  test("a registered record moved out of reach of the validator is refused", async () => {
    await baseRepo();
    await rename(join(dir, LINE), join(dir, `${LINE}.txt`));
    const result = await judge();
    expect(result.output).toContain(`${LINE_DOI} is public at EZID`);
    expect(result.code).toBe(1);
  });

  test("a registered record that no longer passes the schema is refused", async () => {
    await baseRepo();
    await edit(LINE, (json) => {
      json.surprise = true;
    });
    const result = await judge();
    expect(result.output).toContain("no longer passes the record schema");
    expect(result.code).toBe(1);
  });

  test("a registered record that is no longer even a record is refused", async () => {
    await baseRepo();
    await writeFile(join(dir, LINE), "{}\n");
    const result = await judge();
    expect(result.output).toContain("no longer has a readable record");
    expect(result.code).toBe(1);
  });

  test("a registered record does not go back a state", async () => {
    await baseRepo();
    await edit(LINE, (json) => {
      json.state = "reserved";
    });
    const result = await judge();
    expect(result.output).toContain(`${LINE_DOI} cannot go back from public to reserved`);
    expect(result.code).toBe(1);
  });

  test("two records edited at once are both reported", async () => {
    await baseRepo();
    for (const path of [LINE, RELEASE]) {
      await edit(path, (json) => {
        (json.source as Json).repository = "someone/else";
      });
    }
    const result = await judge();
    expect(result.output).toContain(`${LINE_DOI} is never reassigned`);
    expect(result.output).toContain(`${RELEASE_DOI} is never reassigned`);
    expect(result.code).toBe(1);
  });

  test("a registered DOI cannot be pointed at another page", async () => {
    await baseRepo();
    await edit(LINE, (json) => {
      json.target = "https://evil.example/";
    });
    const result = await judge();
    expect(result.output).toContain(`${LINE_DOI} is never pointed elsewhere`);
    expect(result.code).toBe(1);
  });

  test("the time of the first public registration is written once", async () => {
    await baseRepo();
    await edit(LINE, (json) => {
      (json.registered as Json).public_at = "2027-01-01T00:00:00Z";
    });
    const result = await judge();
    expect(result.output).toContain("registered.public_at is written once");
    expect(result.code).toBe(1);
  });

  test("a new record that is already public is refused", async () => {
    await baseRepo();
    await cp(join(dir, LINE), join(dir, "registry/dois/fk2nemar.sample-spec.v3.json"));
    await edit("registry/dois/fk2nemar.sample-spec.v3.json", (json) => {
      json.doi = "10.5072/fk2nemar.sample-spec.v3";
      json.target = "https://doi-test.nemar.org/10.5072/fk2nemar.sample-spec.v3";
    });
    const result = await judge();
    expect(result.output).toContain("a record enters as planned and only the mint run issues it");
    expect(result.code).toBe(1);
  });

  test("a planned record edited to public by hand is refused", async () => {
    await baseRepo(plannedPair);
    await issue(PLANNED, PLANNED_DOI);
    const result = await judge();
    expect(result.output).toContain(`${PLANNED_DOI} is public but was planned`);
    expect(result.code).toBe(1);
  });
});

describe("the mint run's allowance", () => {
  const both = ["--allow-issue", NEXT_RELEASE_DOI, "--allow-issue", PLANNED_DOI];

  test("a release and its own line may be issued, and only they", async () => {
    await baseRepo(plannedPair);
    await issue(NEXT_RELEASE, NEXT_RELEASE_DOI);
    await issue(PLANNED, PLANNED_DOI);
    const result = await judge(...both);
    expect(result.output).toContain("2 registered record(s)");
    expect(result.code).toBe(0);
  });

  test("a release alone does not cover a line issued with it, and a line alone is refused", async () => {
    await baseRepo(plannedPair);
    await issue(NEXT_RELEASE, NEXT_RELEASE_DOI);
    await issue(PLANNED, PLANNED_DOI);
    const releaseOnly = await judge("--allow-issue", NEXT_RELEASE_DOI);
    expect(releaseOnly.output).toContain(`${PLANNED_DOI} is public but was planned`);
    expect(releaseOnly.code).toBe(1);
    const lineOnly = await judge("--allow-issue", PLANNED_DOI);
    expect(lineOnly.output).toContain("takes one release DOI");
    expect(lineOnly.code).toBe(1);
  });

  test("a third DOI, a second release, or a line that is not the release's own is refused", async () => {
    await baseRepo(plannedPair);
    await issue(NEXT_RELEASE, NEXT_RELEASE_DOI);
    await issue(PLANNED, PLANNED_DOI);
    for (const extra of [
      ["--allow-issue", "10.5072/fk2nemar.sample-spec.v3"],
      ["--allow-issue", "10.5072/fk2nemar.sample-spec.v2.1.0"],
    ]) {
      const result = await judge(...both, ...extra);
      expect(result.output).toContain("takes one release DOI");
      expect(result.code).toBe(1);
    }
    const foreign = await judge(
      "--allow-issue",
      NEXT_RELEASE_DOI,
      "--allow-issue",
      "10.5072/fk2nemar.sample-spec.v3",
    );
    expect(foreign.output).toContain("takes one release DOI");
    expect(foreign.code).toBe(1);
    const malformed = await judge("--allow-issue", "not-a-doi");
    expect(malformed.code).toBe(1);
  });

  test("a DOI that is absent at the base is refused", async () => {
    await baseRepo(plannedPair);
    const added = "registry/dois/fk2nemar.sample-spec.v3.0.0.json";
    await cp(join(dir, NEXT_RELEASE), join(dir, added));
    await edit(added, (json) => {
      json.doi = "10.5072/fk2nemar.sample-spec.v3.0.0";
      json.target = "https://doi-test.nemar.org/10.5072/fk2nemar.sample-spec.v3.0.0";
    });
    await issue(added, "10.5072/fk2nemar.sample-spec.v3.0.0");
    const result = await judge("--allow-issue", "10.5072/fk2nemar.sample-spec.v3.0.0");
    expect(result.output).toContain("must be planned in the base revision, not absent");
    expect(result.code).toBe(1);
  });

  test("a DOI that is already issued at the base is refused", async () => {
    await baseRepo(plannedPair);
    const result = await judge("--allow-issue", RELEASE_DOI, "--allow-issue", LINE_DOI);
    expect(result.output).toContain("must be planned in the base revision, not public");
    expect(result.code).toBe(1);
  });

  test("a changed creator, target or note is refused, in the release or in the line", async () => {
    const changes: [string, (json: Json) => void][] = [
      [
        NEXT_RELEASE,
        (json) => {
          const creators = (json.datacite as Json).creators as Json[];
          creators[1] = { nameType: "Organizational", name: "Someone else" };
        },
      ],
      [
        PLANNED,
        (json) => {
          json.target = "https://evil.example/";
        },
      ],
      [
        PLANNED,
        (json) => {
          json.note = "slipped in with the mint";
        },
      ],
    ];
    for (const [path, change] of changes) {
      await rm(dir, { recursive: true, force: true });
      dir = await mkdtemp(join(tmpdir(), "nemar-doi-transitions-"));
      await baseRepo(plannedPair);
      await issue(NEXT_RELEASE, NEXT_RELEASE_DOI);
      await issue(PLANNED, PLANNED_DOI);
      await edit(path, change);
      const result = await judge(...both);
      expect(result.output).toContain("may change only state and registered");
      expect(result.code).toBe(1);
    }
  });

  test("another record issued beside an allowed pair is still refused", async () => {
    await baseRepo(plannedPair);
    await issue(NEXT_RELEASE, NEXT_RELEASE_DOI);
    await issue(PLANNED, PLANNED_DOI);
    await cp(join(dir, LINE), join(dir, "registry/dois/fk2nemar.sample-spec.v3.json"));
    await edit("registry/dois/fk2nemar.sample-spec.v3.json", (json) => {
      json.doi = "10.5072/fk2nemar.sample-spec.v3";
      json.target = "https://doi-test.nemar.org/10.5072/fk2nemar.sample-spec.v3";
    });
    const result = await judge(...both);
    expect(result.output).toContain("10.5072/fk2nemar.sample-spec.v3 is public");
    expect(result.code).toBe(1);
  });
});

describe("the transitions script, other changes", () => {
  test("a planned record can be added, changed and removed, and a public one withdrawn or amended", async () => {
    await baseRepo();
    await rm(join(dir, PLANNED));
    await cp(join(dir, LINE), join(dir, "registry/dois/fk2nemar.sample-spec.v3.json"));
    await edit("registry/dois/fk2nemar.sample-spec.v3.json", (json) => {
      json.doi = "10.5072/fk2nemar.sample-spec.v3";
      json.target = "https://doi-test.nemar.org/10.5072/fk2nemar.sample-spec.v3";
      json.state = "planned";
      delete json.registered;
    });
    await edit(LINE, (json) => {
      json.state = "unavailable";
      json.unavailable = { since: "2026-11-21", reason: "withdrawn" };
      json.note = "amended";
    });
    const result = await judge();
    expect(result.output).toContain("2 registered record(s)");
    expect(result.code).toBe(0);
  });

  test("a withdrawn DOI is public again only with a new reinstated marker", async () => {
    await baseRepo(async (base) => {
      const path = join(base, LINE);
      const json = JSON.parse(await readFile(path, "utf8")) as Json;
      json.state = "unavailable";
      json.unavailable = { since: "2026-11-20", reason: "withdrawn" };
      await writeFile(path, JSON.stringify(json, null, 2));
    });
    await edit(LINE, (json) => {
      json.state = "public";
      delete json.unavailable;
    });
    const bare = await judge();
    expect(bare.output).toContain("without a reinstated block");
    expect(bare.code).toBe(1);
    await edit(LINE, (json) => {
      json.reinstated = { on: "2026-11-21", reason: "the withdrawal was a mistake" };
    });
    expect((await judge()).code).toBe(0);
  });

  test("a base record from an older schema is still judged, and still readable", async () => {
    await baseRepo(async (base) => {
      const path = join(base, LINE);
      const json = JSON.parse(await readFile(path, "utf8")) as Json;
      json.retired_field = "no longer in the schema";
      (json.datacite as Json).language = "en";
      await writeFile(path, JSON.stringify(json, null, 2));
    });
    // The head drops what the schema no longer allows: only the lenient base read lets it through.
    await edit(LINE, (json) => {
      delete json.retired_field;
      delete (json.datacite as Json).language;
    });
    const result = await judge();
    expect(result.output).toContain("2 registered record(s)");
    expect(result.code).toBe(0);
  });

  test("a base record that cannot be read at all fails the check", async () => {
    await baseRepo(async (base) => {
      await writeFile(join(base, "registry/dois/fk2nemar.sample-spec.v8.json"), '{"doi": 8}\n');
    });
    const result = await judge();
    expect(result.output).toContain("cannot be read, so it cannot be judged");
    expect(result.code).toBe(1);
  });
});

describe("transitionProblems", () => {
  const seen = (state: Seen["state"], extra: Partial<Seen> = {}): Seen => ({
    doi: LINE_DOI,
    state,
    target: `https://doi-test.nemar.org/${LINE_DOI}`,
    source: { repository: "nemarOrg/nemar-doi" },
    registered:
      state === "planned"
        ? undefined
        : {
            ezid_identifier: "doi:X",
            reserved_at: "2026-11-20T20:00:00Z",
            public_at: "2026-11-20T20:05:00Z",
          },
    ...extra,
  });

  test("a planned record can be changed or removed, and a new planned record added", () => {
    expect(transitionProblems(seen("planned"), null)).toEqual([]);
    expect(transitionProblems(null, seen("planned"))).toEqual([]);
  });

  test.each(["reserved", "public", "unavailable"] as const)(
    "a %s record is never deleted",
    (state) => {
      expect(transitionProblems(seen(state), null).join("\n")).toContain(
        "never deleted or renamed",
      );
    },
  );

  test.each(["reserved", "public", "unavailable"] as const)(
    "a new %s record is issued by hand unless the mint run says so",
    (state) => {
      expect(transitionProblems(null, seen(state)).join("\n")).toContain(
        "only the mint run issues it",
      );
      expect(transitionProblems(seen("planned"), seen(state)).join("\n")).toContain(
        "only the mint run issues it",
      );
      expect(transitionProblems(seen("planned"), seen(state), true)).toEqual([]);
    },
  );

  test("public and unavailable move, but back to public needs a new reinstated marker", () => {
    expect(transitionProblems(seen("public"), seen("unavailable"))).toEqual([]);
    expect(transitionProblems(seen("unavailable"), seen("public")).join("\n")).toContain(
      "without a reinstated block",
    );
    const marker = { on: "2026-11-21", reason: "mistake" };
    expect(transitionProblems(seen("unavailable"), seen("public", { reinstated: marker }))).toEqual(
      [],
    );
    // A second reinstatement cannot reuse the first one's marker.
    expect(
      transitionProblems(
        seen("unavailable", { reinstated: marker }),
        seen("public", { reinstated: marker }),
      ).join("\n"),
    ).toContain("reinstated must be new");
  });
});

test("checkTransitions fails closed on a base record it cannot read", () => {
  const { problems } = checkTransitions([{ file: "dois/x.json", text: "not json" }], []);
  expect(problems.join("\n")).toContain("cannot be read");
});
