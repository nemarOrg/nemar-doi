/**
 * What a change may do to the registry, judged against its base revision (ADR 0004, ADR 0005).
 *
 * The base side is read leniently, on purpose: a registered record must stay judgeable
 * after the schema grows stricter, so only the few fields a rule needs are parsed, and
 * a base record that cannot be read even that far is a failure, never a pass.
 * Pure functions over parsed files; `scripts/check-transitions.ts` feeds them from git.
 */
import { z } from "zod";
import { lineDoiOf, parseDoi } from "./doi";
import { isIssued, RECORDS_DIR, type RegistryFile, stateRank } from "./registry";
import { recordSchema, STATES } from "./schema";

const leniently = z.looseObject({
  doi: z.string(),
  state: z.enum(STATES),
  target: z.string().optional(),
  source: z.looseObject({
    repository: z.string(),
    tag: z.string().optional(),
    commit: z.string().optional(),
  }),
  registered: z
    .looseObject({
      ezid_identifier: z.string().optional(),
      reserved_at: z.string().optional(),
      public_at: z.string().optional(),
    })
    .optional(),
  reinstated: z.looseObject({ on: z.string(), reason: z.string() }).optional(),
});

/** The fields of a record the transition rules read. */
export type Seen = z.infer<typeof leniently>;

export interface TransitionOptions {
  /**
   * What the mint run may take from `planned` to `reserved` or `public`: one release DOI and,
   * with it, that release's own line DOI (ADR 0003: a line is registered with its first release).
   * Each must be `planned` at the base and may change in no field except `state` and `registered`.
   * Nothing else may be issued: a record enters as `planned` and a person reads it (ADR 0005).
   * No CI job passes this; only the mint workflow does, when it exists.
   */
  allowIssue?: string[];
}

/** Key-order-independent text of a JSON value, so two records compare field by field. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : 1,
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function withoutIssue(raw: unknown): string {
  const {
    state: _state,
    registered: _registered,
    ...rest
  } = (raw ?? {}) as Record<string, unknown>;
  return canonical(rest);
}

/**
 * Which of the requested DOIs the mint run may really issue, and why any other is refused.
 * The shape is fixed: one release, or one release with its own line. A lone line is refused
 * because a line is never registered without its first release (ADR 0003).
 */
function allowance(
  requested: string[],
  before: Map<string, { raw: unknown; state: string }>,
  after: Map<string, { raw: unknown }>,
): { allowed: Set<string>; problems: string[] } {
  if (requested.length === 0) return { allowed: new Set(), problems: [] };
  const refuse = (message: string) => ({ allowed: new Set<string>(), problems: [message] });

  const values = [];
  for (const doi of requested) {
    const result = parseDoi(doi);
    if (!result.ok) return refuse(`--allow-issue: ${result.error}`);
    values.push(result.value);
  }
  const releases = values.filter((value) => value.level === "release");
  const lines = values.filter((value) => value.level === "line");
  const [release] = releases;
  const [line] = lines;
  if (
    !release ||
    releases.length !== 1 ||
    lines.length > 1 ||
    values.length !== releases.length + lines.length ||
    (line && line.doi !== lineDoiOf(release))
  ) {
    return refuse(
      "--allow-issue takes one release DOI, and with it that release's own line DOI, and nothing else",
    );
  }
  for (const doi of requested) {
    const was = before.get(doi);
    if (was?.state !== "planned") {
      return refuse(
        `--allow-issue ${doi}: it must be planned in the base revision, not ${was ? was.state : "absent"}`,
      );
    }
    const now = after.get(doi);
    if (now && withoutIssue(now.raw) !== withoutIssue(was.raw)) {
      return refuse(
        `--allow-issue ${doi}: the mint run may change only state and registered, and this record differs in another field`,
      );
    }
  }
  return { allowed: new Set(requested), problems: [] };
}

const isRecordFile = (file: string) => file.startsWith(`${RECORDS_DIR}/`) && file.endsWith(".json");

/** What one record may become, given what it was. `before` and `after` are the same DOI. */
export function transitionProblems(
  before: Seen | null,
  after: Seen | null,
  issueAllowed = false,
): string[] {
  if (!before || !isIssued(before.state)) {
    // Absent or planned: free to change or vanish, but only the mint run may issue it.
    if (after && isIssued(after.state) && !issueAllowed) {
      return [
        `${after.doi} is ${after.state} but was ${before ? before.state : "not in the registry"}: ` +
          "a record enters as planned and only the mint run issues it",
      ];
    }
    return [];
  }
  if (!after) {
    return [`${before.doi} is ${before.state} at EZID: its record is never deleted or renamed`];
  }
  const problems: string[] = [];
  if (stateRank(after.state) < stateRank(before.state)) {
    problems.push(`${before.doi} cannot go back from ${before.state} to ${after.state}`);
  }
  if (before.state === "unavailable" && after.state === "public") {
    if (!after.reinstated) {
      problems.push(
        `${before.doi} cannot go from unavailable back to public without a reinstated block (on, reason)`,
      );
    } else if (JSON.stringify(after.reinstated) === JSON.stringify(before.reinstated)) {
      problems.push(
        `${before.doi}: reinstated must be new, not the marker of an earlier reinstatement`,
      );
    }
  }
  for (const name of ["reserved_at", "public_at", "ezid_identifier"] as const) {
    const was = before.registered?.[name];
    if (was !== undefined && after.registered?.[name] !== was) {
      problems.push(`${before.doi}: registered.${name} is written once`);
    }
  }
  if (
    after.source.repository !== before.source.repository ||
    after.source.tag !== before.source.tag ||
    after.source.commit !== before.source.commit
  ) {
    problems.push(`${before.doi} is never reassigned: its source cannot change once registered`);
  }
  if (after.target !== before.target) {
    problems.push(
      `${before.doi} is never pointed elsewhere: its target cannot change once registered`,
    );
  }
  return problems;
}

/**
 * Compare the records of a base revision (`base`, paths relative to the registry root) with
 * the working tree (`head`). Returns every problem, empty when the change is allowed.
 */
export function checkTransitions(
  base: { file: string; text: string }[],
  head: RegistryFile[],
  options: TransitionOptions = {},
): { problems: string[]; registered: number } {
  const problems: string[] = [];
  const before = new Map<string, { file: string; seen: Seen; raw: unknown }>();
  for (const { file, text } of base) {
    if (!isRecordFile(file)) continue;
    let seen: Seen;
    let raw: unknown;
    try {
      raw = JSON.parse(text);
      seen = leniently.parse(raw);
    } catch (error) {
      problems.push(
        `${file} at the base revision cannot be read, so it cannot be judged: ${error}`,
      );
      continue;
    }
    before.set(seen.doi, { file, seen, raw });
  }

  const after = new Map<string, { file: string; seen: Seen; strict: boolean; raw: unknown }>();
  const unreadable = new Set<string>();
  for (const { file, json } of head) {
    if (!isRecordFile(file)) continue;
    const seen = leniently.safeParse(json);
    if (!seen.success) {
      unreadable.add(file);
      continue;
    }
    after.set(seen.data.doi, {
      file,
      seen: seen.data,
      strict: recordSchema.safeParse(json).success,
      raw: json,
    });
  }

  const { allowed, problems: refused } = allowance(
    options.allowIssue ?? [],
    new Map([...before].map(([doi, { raw, seen }]) => [doi, { raw, state: seen.state }])),
    after,
  );
  problems.push(...refused);

  let registered = 0;
  for (const [doi, { file, seen }] of before) {
    const now = after.get(doi) ?? null;
    if (isIssued(seen.state)) {
      registered += 1;
      if (!now && unreadable.has(file)) {
        problems.push(`${doi}: ${file} no longer has a readable record`);
        continue;
      }
      if (now && now.file !== file) {
        problems.push(
          `${doi} is registered: its record file ${file} is never moved or renamed (now ${now.file})`,
        );
      }
      if (now && !now.strict) {
        problems.push(`${doi}: the record in ${now.file} no longer passes the record schema`);
      }
    }
    problems.push(...transitionProblems(seen, now?.seen ?? null, allowed.has(doi)));
  }
  for (const [doi, { seen }] of after) {
    if (!before.has(doi)) problems.push(...transitionProblems(null, seen, allowed.has(doi)));
  }
  return { problems, registered };
}
