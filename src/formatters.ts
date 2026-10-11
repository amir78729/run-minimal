import type { Config } from "./types.js";

/**
 * Formats a duration in milliseconds into a readable human-friendly string.
 *
 * - Less than 1 second: e.g. `"245ms"`
 * - Less than 1 minute: e.g. `"3.12s"`
 * - 1 minute or more: e.g. `"2m 05s"`
 *
 * @param milliseconds - The duration in milliseconds.
 * @returns Human-readable duration string.
 *
 * @example
 * ```ts
 * formatDuration(500); // "500ms"
 * formatDuration(3200); // "3.20s"
 * formatDuration(65000); // "1m 05s"
 * ```
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

/**
 * Formats the summary status line indicating whether the command passed or failed.
 *
 * @param success - Whether the command succeeded.
 * @param command - The executed command string.
 * @param duration - Command execution duration in milliseconds.
 * @param config - Configuration settings controlling color and duration display.
 * @returns Formatted summary string, optionally wrapped in ANSI color codes.
 *
 * @example
 * ```ts
 * formatOutput(true, "npm test", 1200, { color: false, duration: true, maxOutput: 0, exitCode: "preserve" });
 * // "✓ npm test passed (1.20s)"
 * ```
 */
export function formatOutput(
  success: boolean,
  command: string,
  duration: number,
  config: Config,
): string {
  const symbol = success ? "✓" : "✗";
  const status = success ? "passed" : "failed";

  const line = [
    symbol,
    command,
    status,
    ...(config.duration ? [`(${formatDuration(duration)})`] : []),
  ].join(" ");

  if (!config.color) {
    return line;
  }

  const color = success ? "\x1b[32m" : "\x1b[31m";
  return `${color}${line}\x1b[0m`;
}

/**
 * Truncates output to keep only the final `maxOutput` characters if exceeded.
 *
 * If `maxOutput` is 0 or the output length is less than or equal to `maxOutput`,
 * the original output is returned unchanged.
 *
 * @param output - The raw output string to potentially truncate.
 * @param maxOutput - Maximum number of characters to retain (0 means unlimited).
 * @returns The original or truncated output string prefixed with truncation notice.
 *
 * @example
 * ```ts
 * tailOutput("hello world", 5);
 * // "… output truncated …\nworld"
 * ```
 */
export function tailOutput(output: string, maxOutput: number): string {
  if (maxOutput === 0 || output.length <= maxOutput) {
    return output;
  }

  return `… output truncated …\n${output.slice(-maxOutput)}`;
}
