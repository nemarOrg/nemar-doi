/**
 * What a change may do to the registry, judged against its base revision (ADR 0004, ADR 0005).
 *
 * The base side is read leniently, on purpose: a registered record must stay judgeable
 * after the schema grows stricter, so only the few fields a rule needs are parsed, and
 * a base record that cannot be read even that far is a failure, never a pass.
 * Pure functions over parsed files; `scripts/check-transitions.ts` feeds them from git.
 */
import { z } from "zod";
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
   * DOIs the mint run may take from absent or `planned` to `reserved` or `public`.
   * Nothing else may: a record enters the registry as `planned` and a person reads it (ADR 0005).
   */
  allowIssue?: string[];
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
  const allowed = new Set(options.allowIssue ?? []);

  const before = new Map<string, { file: string; seen: Seen }>();
  for (const { file, text } of base) {
    if (!isRecordFile(file)) continue;
    let seen: Seen;
    try {
      seen = leniently.parse(JSON.parse(text));
    } catch (error) {
      problems.push(
        `${file} at the base revision cannot be read, so it cannot be judged: ${error}`,
      );
      continue;
    }
    before.set(seen.doi, { file, seen });
  }

  const after = new Map<string, { file: string; seen: Seen; strict: boolean }>();
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
    });
  }

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
