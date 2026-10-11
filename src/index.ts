/**
 * @file Entry point for `run-minimal` programmatic library.
 * Minimizes successful command output to reduce AI agent token usage.
 */

export { VERSION, DEFAULTS, HELP } from "./constants.js";
export { formatDuration, formatOutput, tailOutput } from "./formatters.js";
export { parseBoolean, parseMaxOutput, parseExitCode, parseArgs, readConfig } from "./config.js";
export { runCommand, runMinimal, runCli } from "./runner.js";
export type {
  ExitCodeMode,
  Config,
  ParsedArgs,
  CommandResult,
  RunCommandOptions,
  RunMinimalOptions,
  RunMinimalResult,
} from "./types.js";
