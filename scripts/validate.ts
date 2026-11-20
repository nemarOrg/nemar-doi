/**
 * Validate the registry in the working tree: `bun run validate`.
 * `bun run validate --mint-ready <doi>` also says what still stops that DOI from being minted.
 * Reads files only. It never contacts EZID.
 */
import { join } from "node:path";
import { checkRegistry, mintReadyProblems, readRegistryFiles } from "../src/registry";

const root = join(import.meta.dir, "..", "registry");
const args = process.argv.slice(2);
const mintReady = args[0] === "--mint-ready" ? args[1] : undefined;
if (args.length > 0 && !mintReady) {
  console.error("usage: bun run validate [--mint-ready <doi>]");
  process.exit(2);
}

const { registry, findings } = checkRegistry(await readRegistryFiles(root), "production");
for (const { file, message } of findings) console.error(`registry/${file}: ${message}`);
if (!registry || findings.length > 0) {
  console.error(`${findings.length} problem(s) in the registry`);
  process.exit(1);
}

const states = new Map<string, number>();
for (const { record } of registry.entries.values()) {
  states.set(record.state, (states.get(record.state) ?? 0) + 1);
}
const summary = [...states].map(([state, count]) => `${count} ${state}`).join(", ");
console.log(`registry is valid: ${registry.entries.size} record(s) (${summary || "none"})`);

if (mintReady) {
  const entry = registry.entries.get(mintReady);
  if (!entry) {
    console.error(`${mintReady} has no record`);
    process.exit(1);
  }
  const problems = mintReadyProblems(entry, registry);
  for (const problem of problems) console.error(`${mintReady}: ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(`${mintReady} passes the metadata gate; the live checks in docs/minting.md remain`);
}
