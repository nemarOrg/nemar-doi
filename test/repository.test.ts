/** What must hold of this repository as committed, not of a fixture. */
import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { DATASET_SHAPED_NAME } from "../src/doi";
import { checkRegistry, readRegistryFiles } from "../src/registry";

const root = join(import.meta.dir, "..");

async function run(...command: string[]): Promise<{ code: number; output: string }> {
  const child = Bun.spawn(command, { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, output: out + err };
}

test("the registry is valid and holds production DOIs only", async () => {
  const { registry, findings } = checkRegistry(
    await readRegistryFiles(join(root, "registry")),
    "production",
  );
  expect(findings).toEqual([]);
  expect(registry?.entries.size).toBeGreaterThan(0);
});

test("the delegated dataset space is the one the grammar refuses", async () => {
  const { registry } = checkRegistry(await readRegistryFiles(join(root, "registry")), "production");
  const dataset = registry?.names.delegations.find((d) => d.space === "dataset");
  expect(dataset?.name_pattern).toBe(DATASET_SHAPED_NAME.source);
});

test("the validate command passes on the registry and reports a planned record as not mint-ready", async () => {
  const valid = await run("bun", "run", "scripts/validate.ts");
  expect(valid.output).toContain("registry is valid");
  expect(valid.code).toBe(0);
  const gate = await run(
    "bun",
    "run",
    "scripts/validate.ts",
    "--mint-ready",
    "10.82901/nemar.biosig-zarr.v3",
  );
  expect(gate.output).toContain("datacite.creators is required before minting");
  expect(gate.code).toBe(1);
});

test("the transitions command reads a base revision", async () => {
  const head = await run("bun", "run", "scripts/check-transitions.ts", "HEAD");
  expect(head.output).toContain("none is deleted, rewound or reassigned");
  expect(head.code).toBe(0);
  const missing = await run("bun", "run", "scripts/check-transitions.ts", "no-such-revision");
  expect(missing.code).not.toBe(0);
});

test("the committed JSON Schema files match the declarations", async () => {
  const check = await run("bun", "run", "scripts/gen-schema.ts", "--check");
  expect(check.output).toBe("");
  expect(check.code).toBe(0);
});

test("the decision index lists every ADR file and nothing else", async () => {
  const dir = join(root, ".context", "decisions");
  const files = (await readdir(dir)).filter(
    (f) => /^\d{4}-.+\.md$/.test(f) && !f.startsWith("0000"),
  );
  const index = await Bun.file(join(dir, "README.md")).text();
  const linked = [...index.matchAll(/\]\((\d{4}-[^)]+\.md)\)/g)].map((m) => m[1]);
  expect(linked.sort()).toEqual(files.sort());
  for (const file of files) {
    const text = await Bun.file(join(dir, file)).text();
    expect(text).toMatch(new RegExp(`^# ADR ${file.slice(0, 4)}: `));
    expect(text).toMatch(/^\*\*Status:\*\* (proposed|accepted|superseded by ADR[- ]\d{4})$/m);
  }
});
