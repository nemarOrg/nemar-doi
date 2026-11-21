/**
 * The rules a registry holds as a whole: what one record cannot say about itself.
 * Pure functions over parsed files, so the same checks run on the working tree,
 * on a base revision, and on a registry built in a test.
 */
import { join } from "node:path";
import {
  ezidIdentifier,
  lineDoiOf,
  nameProblem,
  type ParsedDoi,
  parseDoi,
  type Shoulder,
  targetFor,
} from "./doi";
import {
  type DoiRecord,
  KIND_RESOURCE_TYPE,
  type NameTable,
  namesSchema,
  recordSchema,
  type State,
} from "./schema";

export const NAMES_FILE = "names.json";
export const RECORDS_DIR = "dois";
/** The only files in the registry besides the records: a hand-written note beside the data. */
export const README_FILE = "README.md";

export interface Finding {
  file: string;
  message: string;
}

export interface RegistryFile {
  /** Path relative to the registry root, with forward slashes. */
  file: string;
  /** The parsed content of a `.json` file; undefined for any other file, which is never read as data. */
  json: unknown;
}

export interface Entry {
  file: string;
  record: DoiRecord;
  parsed: ParsedDoi;
}

export interface Registry {
  names: NameTable;
  /** Keyed by DOI. */
  entries: Map<string, Entry>;
}

/** `public` and `unavailable` are the same distance from `planned`: both are registered for good. */
const RANK: Record<State, number> = { planned: 0, reserved: 1, public: 2, unavailable: 2 };

/** True from the moment the identifier exists at EZID, which is when it becomes permanent. */
export function isIssued(state: State): boolean {
  return RANK[state] >= RANK.reserved;
}

/** How far a state is from `planned`, for the rule that a record never goes back. */
export function stateRank(state: State): number {
  return RANK[state];
}

function issues(error: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/** What the record itself must say before it is an identifier, whatever else is in the registry. */
function metadataProblems(entry: Entry): string[] {
  const { record, parsed } = entry;
  const problems: string[] = [];
  const { datacite } = record;
  if (!datacite.creators) problems.push("datacite.creators is required before minting");
  if (datacite.publicationYear === undefined) {
    problems.push("datacite.publicationYear is required before minting");
  }
  if (!datacite.descriptions?.some((d) => d.descriptionType === "Abstract")) {
    problems.push("datacite.descriptions needs an Abstract before minting");
  }
  if (!datacite.rightsList) problems.push("datacite.rightsList is required before minting");
  if (parsed.level === "release") {
    if (!record.source.tag || !record.source.commit) {
      problems.push("a release names its source.tag and source.commit before minting");
    }
    if (record.source.tag && ![parsed.version, `v${parsed.version}`].includes(record.source.tag)) {
      problems.push(
        `source.tag "${record.source.tag}" must be ${parsed.version} or v${parsed.version}, the version this DOI names`,
      );
    }
  }
  return problems;
}

/**
 * What stops a record from being minted (nemar-cli ADR 0018, applied here by ADR 0005).
 * A record past `planned` must pass it too, so a record cannot be edited into a state
 * its metadata never earned.
 */
export function mintReadyProblems(entry: Entry, registry: Registry): string[] {
  const { parsed } = entry;
  const problems = metadataProblems(entry);
  if (parsed.level === "release") {
    const line = registry.entries.get(lineDoiOf(parsed));
    if (line && !isIssued(line.record.state)) {
      problems.push(`its line ${line.record.doi} must be registered first`);
    }
  }
  if (parsed.level === "line") {
    // ADR 0003: a line is registered together with its first release, never alone.
    const firstRelease = [...registry.entries.values()].some(
      (other) =>
        other.parsed.level === "release" &&
        lineDoiOf(other.parsed) === parsed.doi &&
        (isIssued(other.record.state) || metadataProblems(other).length === 0),
    );
    if (!firstRelease) {
      problems.push(
        "a line is registered with its first release: no release record of it is ready",
      );
    }
  }
  return problems;
}

function checkEntry(entry: Entry, registry: Registry): string[] {
  const { record, parsed, file } = entry;
  const problems: string[] = [];
  if (file !== `${RECORDS_DIR}/${parsed.suffix}.json`) {
    problems.push(`a record's file is named after its DOI: ${RECORDS_DIR}/${parsed.suffix}.json`);
  }
  if (parsed.level === "work") {
    problems.push("a DOI needs a version part: the bare name is reserved and not issued");
  }
  if (record.target !== targetFor(parsed)) {
    problems.push(`target must be ${targetFor(parsed)}, the DOI's own page (ADR 0007)`);
  }
  const name = registry.names.names[parsed.name];
  if (!name) {
    problems.push(`name "${parsed.name}" is not declared in ${NAMES_FILE}`);
  } else {
    if (record.source.repository !== name.repository) {
      problems.push(`source.repository must be ${name.repository}, the home of "${parsed.name}"`);
    }
    const expected = KIND_RESOURCE_TYPE[name.kind];
    if (record.datacite.types.resourceTypeGeneral !== expected) {
      problems.push(`a ${name.kind} is registered as resourceTypeGeneral ${expected}`);
    }
  }
  if (parsed.level === "release" && !registry.entries.has(lineDoiOf(parsed))) {
    problems.push(`a release needs its line ${lineDoiOf(parsed)} in the registry`);
  }
  if (parsed.level === "line" && (record.source.tag || record.source.commit)) {
    problems.push("a line names a repository, not one tag or commit");
  }

  const { state, registered, unavailable } = record;
  if (isIssued(state)) {
    if (!registered) {
      problems.push(`state ${state} needs the registered block the mint run writes`);
    } else {
      if (registered.ezid_identifier !== ezidIdentifier(record.doi)) {
        problems.push(`registered.ezid_identifier must be ${ezidIdentifier(record.doi)}`);
      }
      if (RANK[state] === RANK.public && !registered.public_at) {
        problems.push(`state ${state} needs registered.public_at`);
      }
      if (state === "reserved" && registered.public_at) {
        problems.push("a reserved DOI has no registered.public_at");
      }
    }
    problems.push(...mintReadyProblems(entry, registry));
  } else if (registered) {
    problems.push("a planned record has no registered block: nothing exists at EZID yet");
  }
  if ((state === "unavailable") !== (unavailable !== undefined)) {
    problems.push("the unavailable block is present exactly when the state is unavailable");
  }
  if (record.reinstated && !isIssued(state)) {
    problems.push("only a registered DOI can have been reinstated");
  }
  return problems;
}

/**
 * Validate a whole registry. `shoulder` is the one every record must sit under:
 * `production` for `registry/`, `test` for anything a test builds (ADR 0006).
 */
export function checkRegistry(
  files: RegistryFile[],
  shoulder: Shoulder,
): { registry: Registry | null; findings: Finding[] } {
  const findings: Finding[] = [];
  const namesFile = files.find((f) => f.file === NAMES_FILE);
  if (!namesFile) {
    return { registry: null, findings: [{ file: NAMES_FILE, message: "is missing" }] };
  }
  const names = namesSchema.safeParse(namesFile.json);
  if (!names.success) {
    return {
      registry: null,
      findings: issues(names.error).map((message) => ({ file: NAMES_FILE, message })),
    };
  }
  for (const name of Object.keys(names.data.names)) {
    const problem = nameProblem(name);
    if (problem) findings.push({ file: NAMES_FILE, message: problem });
    if (names.data.reserved.includes(name)) {
      findings.push({ file: NAMES_FILE, message: `name "${name}" is reserved` });
    }
  }
  for (const delegation of names.data.delegations) {
    let pattern: RegExp;
    try {
      pattern = new RegExp(delegation.name_pattern);
    } catch {
      findings.push({
        file: NAMES_FILE,
        message: `the ${delegation.space} delegation's name_pattern is not a regular expression`,
      });
      continue;
    }
    for (const name of Object.keys(names.data.names)) {
      if (pattern.test(name)) {
        findings.push({
          file: NAMES_FILE,
          message: `name "${name}" falls in the ${delegation.space} space delegated to ${delegation.registry}`,
        });
      }
    }
  }

  const registry: Registry = { names: names.data, entries: new Map() };
  for (const { file, json } of files) {
    if (file === NAMES_FILE || file === README_FILE) continue;
    if (!/^dois\/[^/]+\.json$/.test(file)) {
      findings.push({
        file,
        message: `is not allowed: only ${NAMES_FILE}, ${README_FILE} and ${RECORDS_DIR}/<suffix>.json belong in the registry`,
      });
      continue;
    }
    const record = recordSchema.safeParse(json);
    if (!record.success) {
      findings.push(...issues(record.error).map((message) => ({ file, message })));
      continue;
    }
    const parsed = parseDoi(record.data.doi);
    if (!parsed.ok) {
      findings.push({ file, message: parsed.error });
      continue;
    }
    if (parsed.value.shoulder !== shoulder) {
      findings.push({
        file,
        message: `${record.data.doi} is on the ${parsed.value.shoulder} shoulder; this registry takes ${shoulder} only`,
      });
      continue;
    }
    if (registry.entries.has(record.data.doi)) {
      findings.push({ file, message: `${record.data.doi} already has a record` });
      continue;
    }
    registry.entries.set(record.data.doi, { file, record: record.data, parsed: parsed.value });
  }
  for (const entry of registry.entries.values()) {
    findings.push(...checkEntry(entry, registry).map((message) => ({ file: entry.file, message })));
  }
  return { registry, findings };
}

/** Read every file under a registry root from disk: `.json` files are parsed, others are only listed. */
export async function readRegistryFiles(root: string): Promise<RegistryFile[]> {
  const paths = await Array.fromAsync(
    new Bun.Glob("**/*").scan({ cwd: root, dot: true, onlyFiles: true }),
  );
  const files: RegistryFile[] = [];
  for (const file of paths.map((p) => p.replaceAll("\\", "/")).sort()) {
    if (!file.endsWith(".json")) {
      files.push({ file, json: undefined });
      continue;
    }
    let json: unknown;
    try {
      json = await Bun.file(join(root, file)).json();
    } catch (error) {
      // Name the file: a bare parse error does not say which record is broken.
      throw new Error(
        `${file} is not valid JSON: ${error instanceof Error ? error.message : error}`,
      );
    }
    files.push({ file, json });
  }
  return files;
}
