import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkRegistry,
  mintReadyProblems,
  type RegistryFile,
  readRegistryFiles,
  transitionProblems,
} from "../src/registry";
import { type DoiRecord, recordSchema } from "../src/schema";

const LINE = "dois/fk2nemar.sample-spec.v1.json";
const RELEASE = "dois/fk2nemar.sample-spec.v1.0.0.json";
const PLANNED = "dois/fk2nemar.sample-spec.v2.json";

const fixture = await readRegistryFiles(join(import.meta.dir, "fixtures", "registry"));

type Json = Record<string, unknown>;

/** The fixture registry with one file changed, so each test fails for one reason only. */
function withChange(file: string, change: (json: Json) => void): RegistryFile[] {
  const files = structuredClone(fixture);
  const target = files.find((f) => f.file === file);
  if (!target) throw new Error(`no fixture ${file}`);
  change(target.json as Json);
  return files;
}

function messages(files: RegistryFile[]): string[] {
  return checkRegistry(files, "test").findings.map((f) => `${f.file}: ${f.message}`);
}

function record(file: string): DoiRecord {
  const found = fixture.find((f) => f.file === file);
  return recordSchema.parse(structuredClone(found?.json));
}

describe("checkRegistry", () => {
  test("the fixture registry is valid, so every refusal below has one cause", () => {
    const { registry, findings } = checkRegistry(fixture, "test");
    expect(findings).toEqual([]);
    expect(registry?.entries.size).toBe(3);
  });

  test("a registry takes one shoulder only", () => {
    const asProduction = checkRegistry(fixture, "production").findings;
    expect(asProduction.filter((f) => f.message.includes("test shoulder"))).toHaveLength(3);
  });

  test("a production DOI is refused where test records live", () => {
    const files = withChange(PLANNED, (json) => {
      json.doi = "10.82901/nemar.sample-spec.v2";
    });
    expect(messages(files).join("\n")).toContain("is on the production shoulder");
  });

  test("a record's file is named after its DOI", () => {
    const files = structuredClone(fixture);
    const planned = files.find((f) => f.file === PLANNED);
    if (planned) planned.file = "dois/sample-spec-2.json";
    expect(messages(files).join("\n")).toContain("named after its DOI");
  });

  test("a dataset-shaped DOI is never recorded here", () => {
    const files = withChange(PLANNED, (json) => {
      json.doi = "10.5072/fk2nemar.nm000103";
    });
    expect(messages(files).join("\n")).toContain("delegated to nemar-cli");
  });

  test("a dataset-shaped name is refused in the name table", () => {
    const files = withChange("names.json", (json) => {
      (json.names as Json).nm000103 = { title: "x", kind: "software", repository: "a/b" };
    });
    expect(messages(files).join("\n")).toContain("delegated to nemar-cli");
  });

  test("a name inside any delegated space is refused", () => {
    const delegate = (pattern: string) =>
      withChange("names.json", (json) => {
        (json.delegations as Json[]).push({
          space: "samples",
          name_pattern: pattern,
          registry: "another-registry",
          repository: "nemarOrg/another",
          list_url: "https://example.org/list",
        });
      });
    expect(messages(delegate("^sample-")).join("\n")).toContain(
      'name "sample-spec" falls in the samples space delegated to another-registry',
    );
    expect(messages(delegate("^(sample")).join("\n")).toContain("is not a regular expression");
  });

  test("a reserved name is refused", () => {
    const files = withChange("names.json", (json) => {
      (json.names as Json).nemar = { title: "x", kind: "software", repository: "a/b" };
    });
    expect(messages(files).join("\n")).toContain('name "nemar" is reserved');
  });

  test("a name must be declared before a DOI uses it", () => {
    const files = withChange(PLANNED, (json) => {
      json.doi = "10.5072/fk2nemar.other-spec.v2";
    });
    const planned = files.find((f) => f.file === PLANNED);
    if (planned) planned.file = "dois/fk2nemar.other-spec.v2.json";
    expect(messages(files).join("\n")).toContain('name "other-spec" is not declared');
  });

  test("the bare name is not issued", () => {
    const files = withChange(PLANNED, (json) => {
      json.doi = "10.5072/fk2nemar.sample-spec";
    });
    expect(messages(files).join("\n")).toContain("the bare name is reserved");
  });

  test("a release needs its line", () => {
    const files = fixture.filter((f) => f.file !== LINE);
    expect(messages(files).join("\n")).toContain("a release needs its line");
  });

  test("the resource type follows from the kind of the name", () => {
    const files = withChange(PLANNED, (json) => {
      ((json.datacite as Json).types as Json).resourceTypeGeneral = "Software";
    });
    expect(messages(files).join("\n")).toContain("resourceTypeGeneral Standard");
  });

  test("the source repository is the home of the name", () => {
    const files = withChange(PLANNED, (json) => {
      (json.source as Json).repository = "someone/else";
    });
    expect(messages(files).join("\n")).toContain("source.repository must be nemarOrg/nemar-doi");
  });

  test("a planned record cannot claim a registration", () => {
    const files = withChange(PLANNED, (json) => {
      json.registered = record(LINE).registered;
    });
    expect(messages(files).join("\n")).toContain("nothing exists at EZID yet");
  });

  test("a record cannot be edited to public without the metadata a mint needs", () => {
    const files = withChange(PLANNED, (json) => {
      json.state = "public";
      json.registered = {
        ...record(LINE).registered,
        ezid_identifier: "doi:10.5072/FK2NEMAR.SAMPLE-SPEC.V2",
      };
    });
    const found = messages(files).join("\n");
    expect(found).toContain("datacite.creators is required before minting");
    expect(found).toContain("datacite.publicationYear is required before minting");
    expect(found).toContain("needs an Abstract");
    expect(found).toContain("datacite.rightsList is required before minting");
  });

  test("the EZID identifier is derived from the DOI, not chosen", () => {
    const files = withChange(LINE, (json) => {
      (json.registered as Json).ezid_identifier = "doi:10.5072/FK2NEMAR.SAMPLE-SPEC.V9";
    });
    expect(messages(files).join("\n")).toContain("registered.ezid_identifier must be");
  });

  test("unavailable needs a reason, and only unavailable has one", () => {
    const tombstone = withChange(LINE, (json) => {
      json.state = "unavailable";
    });
    expect(messages(tombstone).join("\n")).toContain("the unavailable block is present exactly");
    const stray = withChange(LINE, (json) => {
      json.unavailable = { since: "2026-11-20", reason: "withdrawn" };
    });
    expect(messages(stray).join("\n")).toContain("the unavailable block is present exactly");
  });

  test("a version relation is derived, so a record cannot store one", () => {
    const files = withChange(RELEASE, (json) => {
      (json.datacite as Json).relatedIdentifiers = [
        {
          relatedIdentifier: "10.5072/fk2nemar.sample-spec.v1",
          relatedIdentifierType: "DOI",
          relationType: "IsVersionOf",
        },
      ];
    });
    expect(messages(files).join("\n")).toContain("relationType");
  });

  test("a person is cited by both parts of a real name", () => {
    const handle = withChange(LINE, (json) => {
      (json.datacite as Json).creators = [{ nameType: "Personal", name: "jcarberry" }];
    });
    expect(messages(handle).join("\n")).toContain("datacite.creators");
    const disagree = withChange(LINE, (json) => {
      (json.datacite as Json).creators = [
        { nameType: "Personal", name: "jcarberry", givenName: "Josiah", familyName: "Carberry" },
      ];
    });
    expect(messages(disagree).join("\n")).toContain('"familyName, givenName"');
  });

  test("an unknown property is refused rather than dropped", () => {
    const files = withChange(PLANNED, (json) => {
      (json.datacite as Json).language = "en";
    });
    expect(messages(files).join("\n")).toContain("language");
  });
});

test("a file that is not JSON is named in the error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nemar-doi-"));
  try {
    await Bun.write(join(dir, "dois", "fk2nemar.sample-spec.v9.json"), "{");
    await expect(readRegistryFiles(dir)).rejects.toThrow(
      "dois/fk2nemar.sample-spec.v9.json is not valid JSON",
    );
  } finally {
    await rm(dir, { recursive: true });
  }
});

describe("mintReadyProblems", () => {
  test("a release waits for its line", () => {
    const files = withChange(LINE, (json) => {
      json.state = "planned";
      delete json.registered;
    });
    const { registry } = checkRegistry(files, "test");
    const release = registry?.entries.get("10.5072/fk2nemar.sample-spec.v1.0.0");
    if (!registry || !release) throw new Error("fixture did not load");
    expect(mintReadyProblems(release, registry).join("\n")).toContain("must be registered first");
  });

  test("a release names the tag and the commit it identifies", () => {
    const files = withChange(RELEASE, (json) => {
      delete (json.source as Json).commit;
    });
    expect(messages(files).join("\n")).toContain("source.tag and source.commit");
  });

  test("a complete record passes", () => {
    const { registry } = checkRegistry(fixture, "test");
    const line = registry?.entries.get("10.5072/fk2nemar.sample-spec.v1");
    if (!registry || !line) throw new Error("fixture did not load");
    expect(mintReadyProblems(line, registry)).toEqual([]);
  });
});

describe("transitionProblems", () => {
  test("a planned record can be changed or removed", () => {
    expect(transitionProblems(record(PLANNED), null)).toEqual([]);
  });

  test("a new record has no past to contradict", () => {
    expect(transitionProblems(null, record(LINE))).toEqual([]);
  });

  test.each(["reserved", "public", "unavailable"] as const)(
    "a %s record is never deleted",
    (state) => {
      const before = { ...record(LINE), state };
      expect(transitionProblems(before, null).join("\n")).toContain("never deleted or renamed");
    },
  );

  test("a registered record does not go back", () => {
    const before = record(LINE);
    expect(transitionProblems(before, { ...before, state: "planned" }).join("\n")).toContain(
      "cannot go back from public to planned",
    );
    expect(transitionProblems(before, { ...before, state: "reserved" }).join("\n")).toContain(
      "cannot go back from public to reserved",
    );
  });

  test("public and unavailable move both ways", () => {
    const before = record(LINE);
    expect(transitionProblems(before, { ...before, state: "unavailable" })).toEqual([]);
    expect(transitionProblems({ ...before, state: "unavailable" }, before)).toEqual([]);
  });

  test("a registered DOI is never pointed at another object", () => {
    const before = record(RELEASE);
    const moved = {
      ...before,
      source: { ...before.source, commit: "f".repeat(40) },
    };
    expect(transitionProblems(before, moved).join("\n")).toContain("never reassigned");
  });

  test("the first registration time is written once", () => {
    const before = record(LINE);
    if (!before.registered) throw new Error("fixture has no registration");
    const after = {
      ...before,
      registered: { ...before.registered, reserved_at: "2027-01-01T00:00:00Z" },
    };
    expect(transitionProblems(before, after).join("\n")).toContain("written once");
  });

  test("metadata and the target of a registered DOI can still be amended", () => {
    const before = record(LINE);
    const after = { ...before, target: "https://doi-test.nemar.org/elsewhere" };
    expect(transitionProblems(before, after)).toEqual([]);
  });
});
