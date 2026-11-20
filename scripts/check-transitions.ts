/**
 * Compare the registry in the working tree with a base revision and refuse a change
 * that deletes, renames, rewinds or reassigns a registered DOI (ADR 0004):
 * `bun run transitions origin/main`.
 */
import { join } from "node:path";
import { RECORDS_DIR, readRegistryFiles, transitionProblems } from "../src/registry";
import { type DoiRecord, recordSchema } from "../src/schema";

const base = process.argv[2];
if (!base) {
  console.error("usage: bun run transitions <base revision>");
  process.exit(2);
}
const repo = join(import.meta.dir, "..");
const prefix = `registry/${RECORDS_DIR}/`;

async function git(...args: string[]): Promise<string> {
  const child = Bun.spawn(["git", ...args], { cwd: repo, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`git ${args.join(" ")} failed: ${err.trim()}`);
  return out;
}

await git("rev-parse", "--verify", `${base}^{commit}`);
const baseFiles = (await git("ls-tree", "-r", "--name-only", base, "--", prefix))
  .split("\n")
  .filter((path) => path.endsWith(".json"));

const after = new Map<string, DoiRecord>();
for (const { file, json } of await readRegistryFiles(join(repo, "registry"))) {
  if (!file.startsWith(`${RECORDS_DIR}/`)) continue;
  const record = recordSchema.safeParse(json);
  if (record.success) after.set(record.data.doi, record.data);
}

const problems: string[] = [];
for (const path of baseFiles) {
  // A base record this code cannot read is a failure, never a pass: it may be a registered DOI.
  const before = recordSchema.parse(JSON.parse(await git("show", `${base}:${path}`)));
  problems.push(...transitionProblems(before, after.get(before.doi) ?? null));
}
for (const problem of problems) console.error(problem);
if (problems.length > 0) process.exit(1);
console.log(`${baseFiles.length} record(s) at ${base}: no registered DOI is deleted or rewound`);
