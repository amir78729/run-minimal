import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  parseArgs,
  parseBoolean,
  parseExitCode,
  parseMaxOutput,
  readConfig,
} from "../src/config.js";
import { DEFAULTS } from "../src/constants.js";

describe("parseBoolean", () => {
  it("returns true for boolean true", () => {
    expect(parseBoolean(true, "color")).toBe(true);
  });

  it("returns false for boolean false", () => {
    expect(parseBoolean(false, "duration")).toBe(false);
  });

  it("throws error for non-boolean values", () => {
    expect(() => parseBoolean("true", "color")).toThrow('"color" must be a boolean.');
    expect(() => parseBoolean(1, "color")).toThrow('"color" must be a boolean.');
    expect(() => parseBoolean(null, "color")).toThrow('"color" must be a boolean.');
    expect(() => parseBoolean(undefined, "color")).toThrow('"color" must be a boolean.');
    expect(() => parseBoolean({}, "color")).toThrow('"color" must be a boolean.');
  });
});

describe("parseMaxOutput", () => {
  it("parses valid non-negative integer numbers", () => {
    expect(parseMaxOutput(0)).toBe(0);
    expect(parseMaxOutput(100)).toBe(100);
    expect(parseMaxOutput("500")).toBe(500);
  });

  it("throws error for negative numbers", () => {
    expect(() => parseMaxOutput(-1)).toThrow("--max-output must be a non-negative integer.");
  });

  it("throws error for non-integers", () => {
    expect(() => parseMaxOutput(3.14)).toThrow("--max-output must be a non-negative integer.");
    expect(() => parseMaxOutput("3.14")).toThrow("--max-output must be a non-negative integer.");
  });

  it("throws error for NaN or non-numeric strings", () => {
    expect(() => parseMaxOutput("abc")).toThrow("--max-output must be a non-negative integer.");
    expect(() => parseMaxOutput(undefined)).toThrow("--max-output must be a non-negative integer.");
    expect(() => parseMaxOutput({})).toThrow("--max-output must be a non-negative integer.");
  });
});

describe("parseExitCode", () => {
  it("accepts preserve and generic", () => {
    expect(parseExitCode("preserve")).toBe("preserve");
    expect(parseExitCode("generic")).toBe("generic");
  });

  it("throws for invalid exit-code modes", () => {
    expect(() => parseExitCode("invalid")).toThrow(
      '--exit-code must be "preserve" or "generic".',
    );
    expect(() => parseExitCode(123)).toThrow(
      '--exit-code must be "preserve" or "generic".',
    );
    expect(() => parseExitCode(null)).toThrow(
      '--exit-code must be "preserve" or "generic".',
    );
  });
});

describe("readConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "run-minimal-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns default config when package.json does not exist (ENOENT)", async () => {
    const config = await readConfig(tempDir);
    expect(config).toEqual(DEFAULTS);
  });

  it("returns default config when package.json has no run-minimal key", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "my-app" }),
      "utf8",
    );
    const config = await readConfig(tempDir);
    expect(config).toEqual(DEFAULTS);
  });

  it("parses valid run-minimal configuration", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        "run-minimal": {
          color: false,
          duration: false,
          maxOutput: 2048,
          exitCode: "generic",
        },
      }),
      "utf8",
    );
    const config = await readConfig(tempDir);
    expect(config).toEqual({
      color: false,
      duration: false,
      maxOutput: 2048,
      exitCode: "generic",
    });
  });

  it("throws when run-minimal in package.json is not an object", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ "run-minimal": "invalid" }),
      "utf8",
    );
    await expect(readConfig(tempDir)).rejects.toThrow(
      '"run-minimal" in package.json must be an object.',
    );

    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ "run-minimal": null }),
      "utf8",
    );
    await expect(readConfig(tempDir)).rejects.toThrow(
      '"run-minimal" in package.json must be an object.',
    );

    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ "run-minimal": [1, 2, 3] }),
      "utf8",
    );
    await expect(readConfig(tempDir)).rejects.toThrow(
      '"run-minimal" in package.json must be an object.',
    );
  });

  it("throws when package.json contains malformed JSON", async () => {
    await writeFile(join(tempDir, "package.json"), "{ invalid json", "utf8");
    await expect(readConfig(tempDir)).rejects.toThrow();
  });

  it("throws when run-minimal contains invalid property types", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ "run-minimal": { color: "not-a-bool" } }),
      "utf8",
    );
    await expect(readConfig(tempDir)).rejects.toThrow('"color" must be a boolean.');

    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ "run-minimal": { duration: 123 } }),
      "utf8",
    );
    await expect(readConfig(tempDir)).rejects.toThrow('"duration" must be a boolean.');

    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ "run-minimal": { maxOutput: -10 } }),
      "utf8",
    );
    await expect(readConfig(tempDir)).rejects.toThrow(
      "--max-output must be a non-negative integer.",
    );

    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ "run-minimal": { exitCode: "unknown" } }),
      "utf8",
    );
    await expect(readConfig(tempDir)).rejects.toThrow(
      '--exit-code must be "preserve" or "generic".',
    );
  });
});

describe("parseArgs", () => {
  it("parses color options", () => {
    expect(parseArgs(["--color", "cmd"]).options.color).toBe(true);
    expect(parseArgs(["--no-color", "cmd"]).options.color).toBe(false);
  });

  it("parses duration options", () => {
    expect(parseArgs(["--duration", "cmd"]).options.duration).toBe(true);
    expect(parseArgs(["--no-duration", "cmd"]).options.duration).toBe(false);
  });

  it("parses max-output option", () => {
    expect(parseArgs(["--max-output", "500", "cmd"]).options.maxOutput).toBe(500);
  });

  it("throws if max-output is missing an argument", () => {
    expect(() => parseArgs(["--max-output"])).toThrow(
      "--max-output requires a character count.",
    );
  });

  it("parses exit-code option", () => {
    expect(parseArgs(["--exit-code", "preserve", "cmd"]).options.exitCode).toBe(
      "preserve",
    );
    expect(parseArgs(["--exit-code", "generic", "cmd"]).options.exitCode).toBe(
      "generic",
    );
  });

  it("throws if exit-code is missing an argument", () => {
    expect(() => parseArgs(["--exit-code"])).toThrow(
      '--exit-code requires "preserve" or "generic".',
    );
  });

  it("handles --help and returns help flag", () => {
    const result = parseArgs(["--help"]);
    expect(result.help).toBe(true);
  });

  it("handles --version and returns version flag", () => {
    const result = parseArgs(["--version"]);
    expect(result.version).toBe(true);
  });

  it("throws on unknown option", () => {
    expect(() => parseArgs(["--unknown", "cmd"])).toThrow("Unknown option: --unknown");
  });

  it("parses command and stops parsing options after first non-option argument", () => {
    const result = parseArgs(["--color", "pnpm", "test", "--watch"]);
    expect(result.options.color).toBe(true);
    expect(result.command).toEqual(["pnpm", "test", "--watch"]);
  });

  it("stops parsing options when encountering '--'", () => {
    const result = parseArgs(["--color", "--", "--no-color", "npm", "test"]);
    expect(result.options.color).toBe(true);
    expect(result.command).toEqual(["--no-color", "npm", "test"]);
  });
});
