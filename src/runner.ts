import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { parseArgs, readConfig } from "./config.js";
import { HELP, VERSION } from "./constants.js";
import { formatOutput, tailOutput } from "./formatters.js";
import type {
  CommandResult,
  RunCommandOptions,
  RunMinimalOptions,
  RunMinimalResult,
} from "./types.js";

/**
 * Spawns a shell command, streaming stdout and stderr into memory buffers while
 * inheriting stdin.
 *
 * @param command - The shell command string to execute.
 * @param options - Execution options such as working directory, environment, or custom spawn.
 * @returns A promise resolving with the process exit code and combined output.
 *
 * @example
 * ```ts
 * const { code, output } = await runCommand("echo 'hello'");
 * console.log(code, output);
 * ```
 */
export function runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const spawnFn = options?.spawn ?? spawn;
    const child = spawnFn(command, {
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
      env: options?.env ?? process.env,
      cwd: options?.cwd ?? process.cwd(),
    });

    let output = "";

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk: string) => {
      output += chunk;
    });

    child.stderr?.on("data", (chunk: string) => {
      output += chunk;
    });

    child.on("error", reject);

    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      if (code !== null) {
        resolve({ code, output });
        return;
      }

      // Shell termination by signal: return a conventional non-zero code.
      resolve({
        code: signal ? 128 + (signal === "SIGINT" ? 2 : 15) : 1,
        output,
      });
    });
  });
}

/**
 * Core orchestration function that parses arguments, loads configuration,
 * runs the requested command, and outputs the formatted minimal summary.
 *
 * @param args - Command line arguments passed to run-minimal.
 * @param options - Optional runner configuration including streams and working directory.
 * @returns The execution result containing exit code, success flag, duration, and output.
 * @throws {Error} If arguments are invalid, no command is specified, or configuration fails to load.
 *
 * @example
 * ```ts
 * const result = await runMinimal(["--no-color", "npm", "test"]);
 * console.log(result.exitCode);
 * ```
 */
export async function runMinimal(
  args: string[],
  options: RunMinimalOptions = {},
): Promise<RunMinimalResult> {
  const stdout = options.stdout ?? ((msg: string) => process.stdout.write(msg));
  const stderr = options.stderr ?? ((msg: string) => process.stderr.write(msg));

  const parsed = parseArgs(args);

  if (parsed.help) {
    stdout(HELP.trimStart());
    return {
      exitCode: 0,
      success: true,
      duration: 0,
      summary: "",
    };
  }

  if (parsed.version) {
    stdout(`${VERSION}\n`);
    return {
      exitCode: 0,
      success: true,
      duration: 0,
      summary: "",
    };
  }

  if (parsed.command.length === 0) {
    throw new Error("A command is required. Use --help for usage.");
  }

  const baseConfig = await readConfig(options.cwd);
  const config = { ...baseConfig, ...parsed.options };

  const commandString = parsed.command.join(" ");
  const start = performance.now();

  let commandResult: CommandResult;

  try {
    commandResult = await runCommand(commandString, {
      cwd: options.cwd,
      env: options.env,
      spawn: options.spawn,
    });
  } catch (error) {
    const duration = performance.now() - start;
    const summary = formatOutput(false, commandString, duration, config);

    stderr(`${summary}\n`);
    stderr(
      `run-minimal: failed to start command: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );

    return {
      exitCode: 1,
      success: false,
      duration,
      summary,
    };
  }

  const duration = performance.now() - start;
  const success = commandResult.code === 0;
  const summary = formatOutput(success, commandString, duration, config);
  const stream = success ? stdout : stderr;

  stream(`${summary}\n`);

  if (!success && commandResult.output.length > 0) {
    stream("\n");
    stream(tailOutput(commandResult.output, config.maxOutput));

    if (!commandResult.output.endsWith("\n")) {
      stream("\n");
    }
  }

  const finalExitCode = success ? 0 : config.exitCode === "preserve" ? commandResult.code : 1;

  return {
    exitCode: finalExitCode,
    success,
    duration,
    summary,
    output: commandResult.output,
  };
}

/**
 * Top-level CLI helper that executes `runMinimal`, logs errors, and returns
 * the appropriate process exit code.
 *
 * @param args - CLI arguments (defaults to `process.argv.slice(2)`).
 * @param options - Custom runner options such as custom streams.
 * @returns The exit code to return to the OS.
 *
 * @example
 * ```ts
 * const code = await runCli(["npm", "test"]);
 * process.exit(code);
 * ```
 */
export async function runCli(
  args: string[] = process.argv.slice(2),
  options: RunMinimalOptions = {},
): Promise<number> {
  const stderr = options.stderr ?? ((msg: string) => process.stderr.write(msg));

  try {
    const result = await runMinimal(args, options);
    return result.exitCode;
  } catch (error) {
    stderr(`run-minimal: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
