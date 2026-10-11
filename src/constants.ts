import type { Config } from "./types.js";

/**
 * Current version of run-minimal.
 */
export const VERSION = "1.0.0";

/**
 * Default configuration options.
 */
export const DEFAULTS: Config = {
  color: true,
  duration: true,
  maxOutput: 0,
  exitCode: "preserve",
};

/**
 * Help text displayed when `--help` flag is supplied.
 */
export const HELP = `
run-minimal — minimize successful command output.

Usage:
  run-minimal [options] <command>
  npx run-minimal [options] <command>

Options:
  --color                 Enable colored output
  --no-color              Disable colored output
  --duration              Show execution duration
  --no-duration           Hide execution duration
  --max-output <chars>    Keep only the last N failure characters (0 = unlimited)
  --exit-code <mode>      "preserve" or "generic"
  --help                  Show this help
  --version               Show version

Configuration in package.json:
  "run-minimal": {
    "color": true,
    "duration": true,
    "maxOutput": 4000,
    "exitCode": "preserve"
  }

CLI options override package.json configuration.
`;
