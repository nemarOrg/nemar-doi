/**
 * Compare the registry in the working tree with a base revision and refuse a change
 * that deletes, renames, rewinds or reassigns a registered DOI, or that issues one by hand
 * (ADR 0004, ADR 0005): `bun run transitions origin/main`.
 *
 *   --allow-issue <doi>  the DOI the mint run may take from planned to reserved or public;
 *                        repeatable, and passed only for the mint run's own result.
 *   --repo <dir>         the repository to check (default: this one); the tests build their own.
 */
import { join, resolve } from "node:path";
import { RECORDS_DIR, readRegistryFiles } from "../src/registry";
import { checkTransitions } from "../src/transitions";

const args = process.argv.slice(2);
const allowIssue: string[] = [];
let repo = join(import.meta.dir, "..");
let base: string | undefined;
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i] ?? "";
  if (arg === "--allow-issue") allowIssue.push(args[++i] ?? "");
  else if (arg === "--repo") repo = resolve(args[++i] ?? "");
  else if (base === undefined && !arg.startsWith("--")) base = arg;
  else {
    base = undefined;
    break;
  }
}
if (!base || allowIssue.includes("")) {
  console.error(
    "usage: bun run transitions <base revision> [--allow-issue <doi>]... [--repo <dir>]",
  );
  process.exit(2);
}

async function git(...command: string[]): Promise<string> {
  const child = Bun.spawn(["git", ...command], { cwd: repo, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`git ${command.join(" ")} failed: ${err.trim()}`);
  return out;
}

await git("rev-parse", "--verify", `${base}^{commit}`);
const prefix = `registry/${RECORDS_DIR}/`;
const baseFiles = [];
for (const path of (await git("ls-tree", "-r", "--name-only", base, "--", prefix))
  .split("\n")
  .filter((p) => p.endsWith(".json"))) {
  baseFiles.push({
    file: path.slice("registry/".length),
    text: await git("show", `${base}:${path}`),
  });
}

const { problems, registered } = checkTransitions(
  baseFiles,
  await readRegistryFiles(join(repo, "registry")),
  { allowIssue },
);
for (const problem of problems) console.error(problem);
if (problems.length > 0) process.exit(1);
console.log(
  `${registered} registered record(s) at ${base}: none is deleted, rewound or reassigned, and no record was issued by hand`,
);
