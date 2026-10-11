import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DEFAULTS } from "./constants.js";
import type { Config, ExitCodeMode, ParsedArgs } from "./types.js";

/**
 * Validates and extracts a boolean value from configuration.
 *
 * @param value - The input value to check.
 * @param name - The field name for the error message.
 * @returns The validated boolean.
 * @throws {Error} If `value` is not a boolean.
 *
 * @example
 * ```ts
 * parseBoolean(true, "color"); // true
 * parseBoolean("true", "color"); // throws Error
 * ```
 */
export function parseBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`"${name}" must be a boolean.`);
  }
  return value;
}

/**
 * Validates and converts an input value to a non-negative integer for maxOutput.
 *
 * @param value - The input value to parse (string or number).
 * @returns The validated non-negative safe integer.
 * @throws {Error} If `value` is not a non-negative safe integer.
 *
 * @example
 * ```ts
 * parseMaxOutput("4000"); // 4000
 * parseMaxOutput(-1); // throws Error
 * ```
 */
export function parseMaxOutput(value: unknown): number {
  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error("--max-output must be a non-negative integer.");
  }

  return number;
}

/**
 * Validates that an exit-code mode is either "preserve" or "generic".
 *
 * @param value - The input value to validate.
 * @returns The validated {@link ExitCodeMode}.
 * @throws {Error} If `value` is neither `"preserve"` nor `"generic"`.
 *
 * @example
 * ```ts
 * parseExitCode("preserve"); // "preserve"
 * parseExitCode("invalid"); // throws Error
 * ```
 */
export function parseExitCode(value: unknown): ExitCodeMode {
  if (value !== "preserve" && value !== "generic") {
    throw new Error('--exit-code must be "preserve" or "generic".');
  }

  return value;
}

/**
 * Reads configuration from `package.json` in the specified directory,
 * falling back to defaults if the file does not exist or the field is omitted.
 *
 * @param cwd - The directory path containing `package.json`. Defaults to `process.cwd()`.
 * @returns The resolved {@link Config} object merged with defaults.
 * @throws {Error} If `package.json` contains malformed JSON or invalid configuration types.
 *
 * @example
 * ```ts
 * const config = await readConfig();
 * console.log(config.color);
 * ```
 */
export async function readConfig(cwd: string = process.cwd()): Promise<Config> {
  let packageConfig: Partial<Config> = {};

  try {
    const packageJsonPath = resolve(cwd, "package.json");
    const fileContent = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(fileContent) as Record<string, unknown>;

    const value = packageJson["run-minimal"];

    if (value !== undefined) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error('"run-minimal" in package.json must be an object.');
      }

      packageConfig = value as Partial<Config>;
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { ...DEFAULTS };
    }

    throw error;
  }

  const config: Config = { ...DEFAULTS };

  if (packageConfig.color !== undefined) {
    config.color = parseBoolean(packageConfig.color, "color");
  }

  if (packageConfig.duration !== undefined) {
    config.duration = parseBoolean(packageConfig.duration, "duration");
  }

  if (packageConfig.maxOutput !== undefined) {
    config.maxOutput = parseMaxOutput(packageConfig.maxOutput);
  }

  if (packageConfig.exitCode !== undefined) {
    config.exitCode = parseExitCode(packageConfig.exitCode);
  }

  return config;
}

/**
 * Parses command-line arguments into configuration options and command tokens.
 *
 * Flags recognized:
 * - `--color` / `--no-color`
 * - `--duration` / `--no-duration`
 * - `--max-output <chars>`
 * - `--exit-code <mode>`
 * - `--help`
 * - `--version`
 * - `--` terminates option parsing; everything after is treated as command tokens.
 *
 * @param args - Array of command-line argument strings (typically `process.argv.slice(2)`).
 * @returns Parsed options, target command array, and help/version flags if encountered.
 * @throws {Error} If an unknown option is encountered or option values are missing/invalid.
 *
 * @example
 * ```ts
 * const { options, command } = parseArgs(["--no-color", "npm", "test"]);
 * ```
 */
export function parseArgs(args: string[]): ParsedArgs {
  const options: Partial<Config> = {};
  const command: string[] = [];
  let parsingOptions = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (parsingOptions && arg === "--") {
      parsingOptions = false;
      continue;
    }

    if (!parsingOptions || !arg.startsWith("--")) {
      command.push(arg);
      parsingOptions = false;
      continue;
    }

    switch (arg) {
      case "--color":
        options.color = true;
        break;

      case "--no-color":
        options.color = false;
        break;

      case "--duration":
        options.duration = true;
        break;

      case "--no-duration":
        options.duration = false;
        break;

      case "--max-output": {
        const value = args[++i];

        if (value === undefined) {
          throw new Error("--max-output requires a character count.");
        }

        options.maxOutput = parseMaxOutput(value);
        break;
      }

      case "--exit-code": {
        const value = args[++i];

        if (value === undefined) {
          throw new Error('--exit-code requires "preserve" or "generic".');
        }

        options.exitCode = parseExitCode(value);
        break;
      }

      case "--help":
        return { options, command, help: true };

      case "--version":
        return { options, command, version: true };

      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { options, command };
}
