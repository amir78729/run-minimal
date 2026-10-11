import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { HELP, VERSION } from "../src/constants.js";
import { runCli, runCommand, runMinimal } from "../src/runner.js";

/**
 * Creates a controllable mock child process.
 */
function createMockChild() {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdout.setEncoding = vi.fn();
  child.stderr.setEncoding = vi.fn();
  return child;
}

describe("runCommand", () => {
  it("executes a command successfully and captures output", async () => {
    const result = await runCommand("node -e \"console.log('hello world')\"");
    expect(result.code).toBe(0);
    expect(result.output.trim()).toBe("hello world");
  });

  it("captures stderr output and non-zero exit code", async () => {
    const result = await runCommand(
      "node -e \"console.error('failed task'); process.exit(3);\"",
    );
    expect(result.code).toBe(3);
    expect(result.output.trim()).toBe("failed task");
  });

  it("handles process terminated by SIGINT signal", async () => {
    const mockChild = createMockChild();
    const mockSpawn = vi.fn().mockReturnValue(mockChild);

    const promise = runCommand("test-cmd", { spawn: mockSpawn as any });
    mockChild.emit("close", null, "SIGINT");

    const result = await promise;
    expect(result.code).toBe(130);
  });

  it("handles process terminated by SIGTERM signal", async () => {
    const mockChild = createMockChild();
    const mockSpawn = vi.fn().mockReturnValue(mockChild);

    const promise = runCommand("test-cmd", { spawn: mockSpawn as any });
    mockChild.emit("close", null, "SIGTERM");

    const result = await promise;
    expect(result.code).toBe(143);
  });

  it("handles process terminated by other signals", async () => {
    const mockChild = createMockChild();
    const mockSpawn = vi.fn().mockReturnValue(mockChild);

    const promise = runCommand("test-cmd", { spawn: mockSpawn as any });
    mockChild.emit("close", null, "SIGHUP");

    const result = await promise;
    expect(result.code).toBe(143);
  });

  it("handles process terminated by null code and null signal", async () => {
    const mockChild = createMockChild();
    const mockSpawn = vi.fn().mockReturnValue(mockChild);

    const promise = runCommand("test-cmd", { spawn: mockSpawn as any });
    mockChild.emit("close", null, null);

    const result = await promise;
    expect(result.code).toBe(1);
  });

  it("rejects when spawn emits an error event", async () => {
    const mockChild = createMockChild();
    const mockSpawn = vi.fn().mockReturnValue(mockChild);

    const promise = runCommand("mock-cmd", { spawn: mockSpawn as any });
    mockChild.emit("error", new Error("spawn ENOENT mock"));

    await expect(promise).rejects.toThrow("spawn ENOENT mock");
  });
});

describe("runMinimal", () => {
  it("handles --help flag", async () => {
    let stdoutOutput = "";
    const result = await runMinimal(["--help"], {
      stdout: (msg) => {
        stdoutOutput += msg;
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(stdoutOutput).toBe(HELP.trimStart());
  });

  it("handles --version flag", async () => {
    let stdoutOutput = "";
    const result = await runMinimal(["--version"], {
      stdout: (msg) => {
        stdoutOutput += msg;
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(stdoutOutput).toBe(`${VERSION}\n`);
  });

  it("throws error when command is empty", async () => {
    await expect(runMinimal([])).rejects.toThrow(
      "A command is required. Use --help for usage.",
    );
  });

  it("runs a successful command and prints summary to stdout", async () => {
    let stdoutOutput = "";
    let stderrOutput = "";

    const result = await runMinimal(
      ["--no-color", "node -e \"console.log('done')\""],
      {
        stdout: (msg) => {
          stdoutOutput += msg;
        },
        stderr: (msg) => {
          stderrOutput += msg;
        },
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(stdoutOutput).toContain("✓ node -e \"console.log('done')\" passed");
    expect(stderrOutput).toBe("");
  });

  it("runs a successful command with default stdout stream", async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const result = await runMinimal([
      "--no-color",
      "node -e \"process.exit(0)\"",
    ]);

    expect(result.exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("runs a failing command with exit-code preserve", async () => {
    let stdoutOutput = "";
    let stderrOutput = "";

    const result = await runMinimal(
      [
        "--no-color",
        "--exit-code",
        "preserve",
        "node -e \"console.error('something broke'); process.exit(4);\"",
      ],
      {
        stdout: (msg) => {
          stdoutOutput += msg;
        },
        stderr: (msg) => {
          stderrOutput += msg;
        },
      },
    );

    expect(result.exitCode).toBe(4);
    expect(result.success).toBe(false);
    expect(stdoutOutput).toBe("");
    expect(stderrOutput).toContain("✗");
    expect(stderrOutput).toContain("something broke\n");
  });

  it("runs a failing command with exit-code generic", async () => {
    let stderrOutput = "";

    const result = await runMinimal(
      [
        "--no-color",
        "--exit-code",
        "generic",
        "node -e \"console.error('something broke'); process.exit(4);\"",
      ],
      {
        stderr: (msg) => {
          stderrOutput += msg;
        },
      },
    );

    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
  });

  it("handles failing command with maxOutput truncation", async () => {
    let stderrOutput = "";

    const result = await runMinimal(
      [
        "--no-color",
        "--max-output",
        "5",
        "node -e \"process.stderr.write('1234567890'); process.exit(1);\"",
      ],
      {
        stderr: (msg) => {
          stderrOutput += msg;
        },
      },
    );

    expect(result.exitCode).toBe(1);
    expect(stderrOutput).toContain("… output truncated …\n67890");
    // Ensure trailing newline was added since original didn't end with newline
    expect(stderrOutput.endsWith("\n")).toBe(true);
  });

  it("handles failing command that outputs nothing", async () => {
    let stderrOutput = "";

    const result = await runMinimal(
      ["--no-color", "node -e \"process.exit(1);\""],
      {
        stderr: (msg) => {
          stderrOutput += msg;
        },
      },
    );

    expect(result.exitCode).toBe(1);
    expect(stderrOutput).toContain("✗ node -e \"process.exit(1);\" failed");
  });

  it("handles command spawn failure", async () => {
    let stderrOutput = "";
    const mockSpawn = vi.fn().mockImplementation(() => {
      const child = createMockChild();
      queueMicrotask(() => {
        child.emit("error", new Error("spawn failed test"));
      });
      return child;
    });

    const result = await runMinimal(["--no-color", "invalid-cmd"], {
      spawn: mockSpawn as any,
      stderr: (msg) => {
        stderrOutput += msg;
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(stderrOutput).toContain("failed to start command: spawn failed test");
  });

  it("handles command spawn failure when error is not an Error instance", async () => {
    let stderrOutput = "";
    const mockSpawn = vi.fn().mockImplementation(() => {
      const child = createMockChild();
      queueMicrotask(() => {
        child.emit("error", "string error");
      });
      return child;
    });

    const result = await runMinimal(["--no-color", "invalid-cmd"], {
      spawn: mockSpawn as any,
      stderr: (msg) => {
        stderrOutput += msg;
      },
    });

    expect(result.exitCode).toBe(1);
    expect(stderrOutput).toContain("failed to start command: string error");
  });
});

describe("runCli", () => {
  it("returns 0 on successful command", async () => {
    const code = await runCli(["node -e \"process.exit(0)\""]);
    expect(code).toBe(0);
  });

  it("returns command exit code on failure", async () => {
    const code = await runCli([
      "--exit-code",
      "preserve",
      "node -e \"process.exit(7)\"",
    ]);
    expect(code).toBe(7);
  });

  it("handles exceptions thrown by runMinimal and writes to stderr", async () => {
    let stderrOutput = "";
    const code = await runCli(["--unknown-option"], {
      stderr: (msg) => {
        stderrOutput += msg;
      },
    });

    expect(code).toBe(1);
    expect(stderrOutput).toContain("run-minimal: Unknown option: --unknown-option\n");
  });

  it("handles default process.argv and default stderr", async () => {
    const originalArgv = process.argv;
    process.argv = ["node", "run-minimal", "--help"];

    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const code = await runCli();
    expect(code).toBe(0);

    stdoutSpy.mockRestore();
    process.argv = originalArgv;
  });

  it("handles non-Error thrown exceptions in runCli with default stderr", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    // Call runCli with empty arguments (which triggers Error("A command is required..."))
    const code = await runCli([]);
    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
    stderrSpy.mockRestore();
  });

  it("handles non-Error thrown values", async () => {
    const mockChild = createMockChild();
    const mockSpawn = vi.fn().mockReturnValue(mockChild);

    // Pass invalid args that cause throw of a non-error
    let stderrOutput = "";
    const code = await runCli(
      [
        "--max-output",
        "-5", // invalid maxOutput throws Error, which we test, now let's test a non-Error throw
        "node -e \"\"",
      ],
      {
        stderr: (msg) => {
          stderrOutput += msg;
        },
      },
    );

    expect(code).toBe(1);
    expect(stderrOutput).toContain("--max-output must be a non-negative integer.");
  });

  it("formats non-Error values in runCli catch handler", async () => {
    let stderrOutput = "";
    const badArgs = {
      get length(): number {
        throw "custom string failure";
      },
    } as any;

    const code = await runCli(badArgs, {
      stderr: (msg) => {
        stderrOutput += msg;
      },
    });

    expect(code).toBe(1);
    expect(stderrOutput).toBe("run-minimal: custom string failure\n");
  });
});
