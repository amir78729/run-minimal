import type { spawn } from "node:child_process";

/**
 * Mode determining how exit codes are handled when a child command fails.
 *
 * - `"preserve"`: Re-emits the exact non-zero exit code of the executed command.
 * - `"generic"`: Normalizes any command failure to exit code 1.
 */
export type ExitCodeMode = "preserve" | "generic";

/**
 * Configuration options for `run-minimal`.
 */
export interface Config {
  /**
   * Whether ANSI color output is enabled in the summary line.
   * Defaults to `true`.
   */
  color: boolean;

  /**
   * Whether execution duration is shown in the summary line.
   * Defaults to `true`.
   */
  duration: boolean;

  /**
   * Maximum number of output characters to keep from a failed command's tail.
   * A value of `0` means unlimited output. Defaults to `0`.
   */
  maxOutput: number;

  /**
   * Strategy for child process non-zero exit codes.
   * Defaults to `"preserve"`.
   */
  exitCode: ExitCodeMode;
}

/**
 * Result of parsing command-line arguments.
 */
export interface ParsedArgs {
  /**
   * Configuration options specified via command-line flags.
   */
  options: Partial<Config>;

  /**
   * The command and its arguments to be executed.
   */
  command: string[];

  /**
   * True if `--help` flag was encountered.
   */
  help?: boolean;

  /**
   * True if `--version` flag was encountered.
   */
  version?: boolean;
}

/**
 * Result of executing a command in a child process.
 */
export interface CommandResult {
  /**
   * The process exit code (0 for success, non-zero for failure).
   */
  code: number;

  /**
   * Interleaved stdout and stderr combined output from the child process.
   */
  output: string;
}

/**
 * Options for executing commands via `runCommand`.
 */
export interface RunCommandOptions {
  /**
   * Working directory for command execution.
   */
  cwd?: string;

  /**
   * Environment variables for the child process.
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Custom spawn function (defaults to `node:child_process.spawn`).
   */
  spawn?: typeof spawn;
}

/**
 * Options for running the `runMinimal` orchestrator.
 */
export interface RunMinimalOptions {
  /**
   * Working directory used to read `package.json` config and execute the command.
   * Defaults to `process.cwd()`.
   */
  cwd?: string;

  /**
   * Environment variables passed to the child process.
   * Defaults to `process.env`.
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Output stream interface for writing stdout.
   * Defaults to a wrapper around `process.stdout.write`.
   */
  stdout?: (message: string) => void;

  /**
   * Output stream interface for writing stderr.
   * Defaults to a wrapper around `process.stderr.write`.
   */
  stderr?: (message: string) => void;

  /**
   * Custom spawn function for executing the child process.
   */
  spawn?: typeof spawn;
}

/**
 * Final execution result returned by `runMinimal`.
 */
export interface RunMinimalResult {
  /**
   * The overall process exit code to be returned to the OS.
   */
  exitCode: number;

  /**
   * Whether the command succeeded (exit code was 0).
   */
  success: boolean;

  /**
   * Duration of the command run in milliseconds.
   */
  duration: number;

  /**
   * Formatted status summary line (colored or uncolored).
   */
  summary: string;

  /**
   * Output captured from the command (or truncated output if maxOutput was set).
   */
  output?: string;
}
