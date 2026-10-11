import { describe, expect, it, vi } from "vitest";

describe("cli entry point", () => {
  it("executes CLI entry point and calls process.exit", async () => {
    const originalArgv = process.argv;
    process.argv = ["node", "run-minimal", "--version"];

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {}) as any);

    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await import("../src/cli.js");

    expect(stdoutSpy).toHaveBeenCalledWith("1.0.0\n");
    expect(exitSpy).toHaveBeenCalledWith(0);

    stdoutSpy.mockRestore();
    exitSpy.mockRestore();
    process.argv = originalArgv;
  });
});
