/**
 * The grammar of a NEMAR DOI (ADR 0002, ADR 0003).
 *
 *   doi      = shoulder name [ ".v" major [ "." minor "." patch ] ]
 *   shoulder = "10.82901/nemar."        production
 *            | "10.5072/fk2nemar."      the EZID test shoulder (ADR 0006)
 *   name     = segment *( "-" segment ), 3 to 32 characters
 *
 * A name made of letters followed only by digits is dataset-shaped. That space
 * belongs to nemar-cli (ADR 0001) and this registry never issues from it.
 */

export const SHOULDERS = {
  production: "10.82901/nemar.",
  test: "10.5072/fk2nemar.",
} as const;

export type Shoulder = keyof typeof SHOULDERS;

/** The host of the landing page a DOI on each shoulder resolves to (ADR 0007; ADR 0006 for staging). */
export const TARGET_HOSTS: Record<Shoulder, string> = {
  production: "doi.nemar.org",
  test: "doi-test.nemar.org",
};

/** Letters followed only by digits: `nm000103`, `on009081`, and any future prefix or width. */
export const DATASET_SHAPED_NAME = /^[a-z]+[0-9]+$/;

const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 32;
/** At most six digits, so a number is exact in JavaScript and never prints in exponent form. */
const NUMBER = "(?:0|[1-9][0-9]{0,5})";
const VERSION = new RegExp(`^(${NUMBER})(?:\\.(${NUMBER})\\.(${NUMBER}))?$`);

/**
 * `work` is the bare name with no version. The grammar parses it so the name stays
 * reserved, and the registry refuses a record at that level (ADR 0003).
 */
export type Level = "work" | "line" | "release";

interface ParsedBase {
  doi: string;
  shoulder: Shoulder;
  /** The part after the DOI prefix and its slash, which is also the record's file name stem. */
  suffix: string;
  name: string;
}

export interface ParsedWork extends ParsedBase {
  level: "work";
  major: null;
  version: null;
}

export interface ParsedLine extends ParsedBase {
  level: "line";
  major: number;
  /** `3`. */
  version: string;
}

export interface ParsedRelease extends ParsedBase {
  level: "release";
  major: number;
  /** `3.1.0`. */
  version: string;
}

/** Discriminated on `level`, so a function that needs a release cannot be handed a work. */
export type ParsedDoi = ParsedWork | ParsedLine | ParsedRelease;

export type ParseResult = { ok: true; value: ParsedDoi } | { ok: false; error: string };

/** Why `name` cannot be a registry name, or null when it can. */
export function nameProblem(name: string): string | null {
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return `name "${name}" must be ${NAME_MIN_LENGTH} to ${NAME_MAX_LENGTH} characters`;
  }
  if (!NAME.test(name)) {
    return `name "${name}" must be lowercase letters and digits in hyphen-separated segments, starting with a letter`;
  }
  if (DATASET_SHAPED_NAME.test(name)) {
    return `name "${name}" is dataset-shaped (letters followed only by digits); that space is delegated to nemar-cli`;
  }
  return null;
}

export function parseDoi(doi: string): ParseResult {
  if (doi !== doi.toLowerCase()) {
    return { ok: false, error: `"${doi}" must be written in lowercase` };
  }
  const shoulder = (Object.keys(SHOULDERS) as Shoulder[]).find((key) =>
    doi.startsWith(SHOULDERS[key]),
  );
  if (!shoulder) {
    return { ok: false, error: `"${doi}" is not under a NEMAR shoulder` };
  }
  const rest = doi.slice(SHOULDERS[shoulder].length);
  const separator = rest.indexOf(".");
  const name = separator === -1 ? rest : rest.slice(0, separator);
  const problem = nameProblem(name);
  if (problem) return { ok: false, error: problem };

  const suffix = doi.slice(doi.indexOf("/") + 1);
  if (separator === -1) {
    return {
      ok: true,
      value: { doi, shoulder, suffix, name, level: "work", major: null, version: null },
    };
  }
  const tail = rest.slice(separator + 1);
  const match = tail.startsWith("v") ? VERSION.exec(tail.slice(1)) : null;
  if (!match) {
    return {
      ok: false,
      error: `"${doi}" must end in .v<major> or .v<major>.<minor>.<patch>, with no leading zeros and no pre-release part`,
    };
  }
  const version = tail.slice(1);
  const major = Number(match[1]);
  const base = { doi, shoulder, suffix, name, major, version };
  return {
    ok: true,
    value: match[2] === undefined ? { ...base, level: "line" } : { ...base, level: "release" },
  };
}

/** Where a DOI must resolve: its own page on the NEMAR landing site (ADR 0007). */
export function targetFor(parsed: ParsedDoi): string {
  return `https://${TARGET_HOSTS[parsed.shoulder]}/${parsed.doi}`;
}

/** The line a release belongs to: `…biosig-zarr.v3.1.0` gives `…biosig-zarr.v3`. */
export function lineDoiOf(release: ParsedRelease): string {
  return `${SHOULDERS[release.shoulder]}${release.name}.v${release.major}`;
}

/** EZID spells a DOI in uppercase behind a `doi:` scheme, as nemar-cli's identifiers are. */
export function ezidIdentifier(doi: string): string {
  return `doi:${doi.toUpperCase()}`;
}
