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

/** Letters followed only by digits: `nm000103`, `on009081`, and any future prefix or width. */
export const DATASET_SHAPED_NAME = /^[a-z]+[0-9]+$/;

const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 32;
const NUMBER = "(?:0|[1-9][0-9]*)";
const VERSION = new RegExp(`^(${NUMBER})(?:\\.(${NUMBER})\\.(${NUMBER}))?$`);

/**
 * `work` is the bare name with no version. The grammar parses it so the name stays
 * reserved, and the registry refuses a record at that level (ADR 0003).
 */
export type Level = "work" | "line" | "release";

export interface ParsedDoi {
  doi: string;
  shoulder: Shoulder;
  /** The part after the DOI prefix and its slash, which is also the record's file name stem. */
  suffix: string;
  name: string;
  level: Level;
  major: number | null;
  /** `3` for a line, `3.1.0` for a release, null for a work. */
  version: string | null;
}

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
  return {
    ok: true,
    value: {
      doi,
      shoulder,
      suffix,
      name,
      level: match[2] === undefined ? "line" : "release",
      major: Number(match[1]),
      version,
    },
  };
}

/** The line a release belongs to: `…biosig-zarr.v3.1.0` gives `…biosig-zarr.v3`. */
export function lineDoiOf(release: ParsedDoi): string {
  return `${SHOULDERS[release.shoulder]}${release.name}.v${release.major}`;
}

/** EZID spells a DOI in uppercase behind a `doi:` scheme, as nemar-cli's identifiers are. */
export function ezidIdentifier(doi: string): string {
  return `doi:${doi.toUpperCase()}`;
}
