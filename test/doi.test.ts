import { describe, expect, test } from "bun:test";
import { ezidIdentifier, lineDoiOf, nameProblem, parseDoi } from "../src/doi";

function parsed(doi: string) {
  const result = parseDoi(doi);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function refusal(doi: string): string {
  const result = parseDoi(doi);
  if (result.ok) throw new Error(`${doi} was accepted`);
  return result.error;
}

describe("parseDoi", () => {
  test("a major line is the concept", () => {
    expect(parsed("10.82901/nemar.biosig-zarr.v3")).toEqual({
      doi: "10.82901/nemar.biosig-zarr.v3",
      shoulder: "production",
      suffix: "nemar.biosig-zarr.v3",
      name: "biosig-zarr",
      level: "line",
      major: 3,
      version: "3",
    });
  });

  test("a release sits under its line", () => {
    const release = parsed("10.82901/nemar.biosig-zarr.v3.10.2");
    expect(release.level).toBe("release");
    expect(release.major).toBe(3);
    expect(release.version).toBe("3.10.2");
    expect(lineDoiOf(release)).toBe("10.82901/nemar.biosig-zarr.v3");
  });

  test("major zero is a line", () => {
    expect(parsed("10.82901/nemar.process.v0").major).toBe(0);
    expect(parsed("10.82901/nemar.process.v0.1.0").version).toBe("0.1.0");
  });

  test("the bare name parses as a work so that it stays reserved", () => {
    expect(parsed("10.82901/nemar.biosig-zarr").level).toBe("work");
  });

  test("the test shoulder is told apart from production", () => {
    const test = parsed("10.5072/fk2nemar.sample-spec.v1");
    expect(test.shoulder).toBe("test");
    expect(test.suffix).toBe("fk2nemar.sample-spec.v1");
  });

  test.each([
    "10.82901/nemar.nm000103",
    "10.82901/nemar.on009081",
    "10.82901/nemar.nm000103.v2.0.0",
    "10.82901/nemar.xx099900",
    "10.82901/nemar.abc1234567",
    "10.82901/nemar.eeg2",
  ])("%s is dataset-shaped and refused", (doi) => {
    expect(refusal(doi)).toContain("delegated to nemar-cli");
  });

  test.each([
    ["10.82901/NEMAR.BIOSIG-ZARR.V3", "lowercase"],
    ["10.82901/nemar.Biosig-zarr.v3", "lowercase"],
    ["10.1234/nemar.biosig-zarr.v3", "not under a NEMAR shoulder"],
    ["10.82901/biosig-zarr.v3", "not under a NEMAR shoulder"],
    ["10.5072/nemar.biosig-zarr.v3", "not under a NEMAR shoulder"],
    ["10.82901/nemar.ab.v1", "3 to 32 characters"],
    ["10.82901/nemar.biosig_zarr.v3", "hyphen-separated"],
    ["10.82901/nemar.biosig--zarr.v3", "hyphen-separated"],
    ["10.82901/nemar.-biosig.v3", "hyphen-separated"],
    ["10.82901/nemar.biosig-.v3", "hyphen-separated"],
    ["10.82901/nemar.3d-scan.v1", "hyphen-separated"],
    ["10.82901/nemar.biosig/zarr.v3", "hyphen-separated"],
    ["10.82901/nemar.biosig-zarr.3", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v03", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v3.0", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v3.0.0.1", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v3.00.1", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v3.0.0-draft.1", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v3.0.0+build", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.latest", ".v<major>"],
    ["10.82901/nemar.biosig-zarr.v3 ", ".v<major>"],
  ])("%s is refused: %s", (doi, reason) => {
    expect(refusal(doi)).toContain(reason);
  });
});

describe("nameProblem", () => {
  test.each(["biosig-zarr", "process", "hed", "eeg-2", "a1b", "x".repeat(32)])(
    "%s is a name",
    (name) => {
      expect(nameProblem(name)).toBeNull();
    },
  );

  test.each(["ab", "x".repeat(33), "nm000103", "on1", "abc123"])("%s is not", (name) => {
    expect(nameProblem(name)).not.toBeNull();
  });
});

test("the EZID identifier is the uppercase DOI behind a scheme", () => {
  expect(ezidIdentifier("10.82901/nemar.biosig-zarr.v3")).toBe("doi:10.82901/NEMAR.BIOSIG-ZARR.V3");
});
