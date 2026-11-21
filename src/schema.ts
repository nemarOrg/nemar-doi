/**
 * The one declaration of a registry record and of the name table.
 * `schema/*.schema.json` is generated from this file (`bun run schema`).
 *
 * Every object is strict: a property the minting code would not send to EZID is
 * refused here, so nothing in a record is dropped silently at mint time.
 */
import { z } from "zod";

/** The publisher string on every NEMAR DataCite record, dataset or not. */
export const PUBLISHER = "NEMAR (Neuroelectromagnetic Data Archive and Tools Resource)";

/** What a name identifies, and the DataCite general resource type that follows from it. */
export const KINDS = ["specification", "software"] as const;
export const RESOURCE_TYPES = ["Standard", "Software"] as const;
export const KIND_RESOURCE_TYPE: Record<(typeof KINDS)[number], (typeof RESOURCE_TYPES)[number]> = {
  specification: "Standard",
  software: "Software",
};

export const STATES = ["planned", "reserved", "public", "unavailable"] as const;
export type State = (typeof STATES)[number];

/**
 * The relations a record may declare. The version relations (IsVersionOf, HasVersion,
 * IsNewVersionOf, IsPreviousVersionOf) are absent on purpose: they are derived from the
 * registry at mint time, so a stored copy cannot disagree with it (ADR 0003).
 */
const RELATION_TYPES = [
  "IsDocumentedBy",
  "Documents",
  "IsDescribedBy",
  "Describes",
  "IsSupplementTo",
  "IsSupplementedBy",
  "IsReferencedBy",
  "References",
  "IsRequiredBy",
  "Requires",
  "IsDerivedFrom",
  "IsSourceOf",
  "IsPartOf",
  "HasPart",
  "IsIdenticalTo",
  "Obsoletes",
  "IsObsoletedBy",
] as const;

const text = z.string().trim().min(1);
const httpsUrl = z.url({ protocol: /^https$/ });
const date = z.iso.date();
const dateTime = z.iso.datetime();

/** ISO 7064 mod 11-2, the check character ORCID puts last in every iD. */
export function orcidChecksumOk(id: string): boolean {
  const digits = id.replaceAll("-", "");
  let total = 0;
  for (const char of digits.slice(0, 15)) total = (total + Number(char)) * 2;
  const check = (12 - (total % 11)) % 11;
  return digits[15] === (check === 10 ? "X" : String(check));
}

/** `owner/name` on GitHub; the name may not be `.` or `..`, so a path cannot escape the repository. */
const repositorySlug = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/);

const orcid = z.strictObject({
  nameIdentifier: z
    .string()
    .regex(/^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)
    .refine((value) => orcidChecksumOk(value.slice("https://orcid.org/".length)), {
      message: "the ORCID iD check character is wrong",
    }),
  nameIdentifierScheme: z.literal("ORCID"),
  schemeUri: z.literal("https://orcid.org"),
});

const ror = z.strictObject({
  nameIdentifier: z.string().regex(/^https:\/\/ror\.org\/0[a-z0-9]{8}$/),
  nameIdentifierScheme: z.literal("ROR"),
  schemeUri: z.literal("https://ror.org"),
});

const affiliation = z.strictObject({ name: text });

/**
 * A person is cited by the name they publish under, in both parts, or not at all
 * (nemar-cli ADR 0041). There is no field a login handle could go in.
 */
const person = z
  .strictObject({
    nameType: z.literal("Personal"),
    name: text,
    givenName: text,
    familyName: text,
    nameIdentifiers: z.array(orcid).max(1).optional(),
    affiliation: z.array(affiliation).optional(),
  })
  .refine((p) => p.name === `${p.familyName}, ${p.givenName}`, {
    message: 'a personal name is written "familyName, givenName"',
    path: ["name"],
  });

const organization = z.strictObject({
  nameType: z.literal("Organizational"),
  name: text,
  nameIdentifiers: z.array(ror).max(1).optional(),
});

const agent = z.union([person, organization]);

const datacite = z.strictObject({
  titles: z.array(z.strictObject({ title: text })).min(1),
  publisher: z.literal(PUBLISHER),
  types: z.strictObject({
    resourceTypeGeneral: z.enum(RESOURCE_TYPES),
    resourceType: text,
  }),
  creators: z.array(agent).min(1).optional(),
  publicationYear: z.int().min(2020).max(2100).optional(),
  descriptions: z
    .array(
      z.strictObject({
        description: text,
        descriptionType: z.enum(["Abstract", "TechnicalInfo", "Other"]),
      }),
    )
    .min(1)
    .optional(),
  rightsList: z
    .array(
      z.strictObject({
        rights: text,
        rightsUri: httpsUrl,
        rightsIdentifier: text,
        rightsIdentifierScheme: z.literal("SPDX"),
      }),
    )
    .min(1)
    .optional(),
  subjects: z.array(z.strictObject({ subject: text })).optional(),
  contributors: z
    .array(
      z.strictObject({
        contributor: agent,
        contributorType: z.enum(["ContactPerson", "Editor", "ProjectLeader", "Other"]),
      }),
    )
    .optional(),
  relatedIdentifiers: z
    .array(
      z.strictObject({
        relatedIdentifier: text,
        relatedIdentifierType: z.enum(["DOI", "URL"]),
        relationType: z.enum(RELATION_TYPES),
      }),
    )
    .optional(),
});

export const recordSchema = z.strictObject({
  schema_version: z.literal(1),
  /** Lowercase, complete, and the only statement of the record's name, level and version. Not trimmed: whitespace is refused by the grammar, not silently removed. */
  doi: z.string().min(1),
  state: z.enum(STATES),
  /** Where the DOI resolves: its own page on doi.nemar.org, which the registry checks (ADR 0007). */
  target: httpsUrl,
  /** The object the DOI names. A release pins the tag and the commit the tag points at. */
  source: z.strictObject({
    repository: repositorySlug,
    tag: text.optional(),
    commit: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .optional(),
  }),
  datacite,
  /** What the registrar holds. Present from `reserved` on, written by the mint run. */
  registered: z
    .strictObject({
      ezid_identifier: text,
      reserved_at: dateTime,
      public_at: dateTime.optional(),
      /** SHA-256 of the DataCite XML last sent to EZID for this DOI. */
      metadata_sha256: z.string().regex(/^[0-9a-f]{64}$/),
    })
    .optional(),
  /** Present exactly when the state is `unavailable`. The DOI still resolves, to a tombstone. */
  unavailable: z.strictObject({ since: date, reason: text }).optional(),
  /**
   * The owner's marker that a withdrawn DOI is public again: required on the way from
   * `unavailable` back to `public`, and different each time. Never on `planned` or `reserved`.
   */
  reinstated: z.strictObject({ on: date, reason: text }).optional(),
  note: text.optional(),
});

export type DoiRecord = z.infer<typeof recordSchema>;

export const namesSchema = z.strictObject({
  schema_version: z.literal(1),
  /** Suffix spaces whose registry of record is another system. Listed, never copied here. */
  delegations: z.array(
    z.strictObject({
      space: text,
      /** A regular expression over the name part of a suffix. */
      name_pattern: text,
      registry: text,
      repository: repositorySlug,
      /** The public, anonymous endpoint the page lists this space from. */
      list_url: httpsUrl,
      note: text.optional(),
    }),
  ),
  /** Names nobody may be given. */
  reserved: z.array(text),
  names: z.record(
    z.string(),
    z.strictObject({
      title: text,
      kind: z.enum(KINDS),
      repository: repositorySlug,
    }),
  ),
});

export type NameTable = z.infer<typeof namesSchema>;
