import { describe, expect, it } from "vitest";
import * as runMinimal from "../src/index.js";

describe("index exports", () => {
  it("exports all public API functions, constants, and types", () => {
    expect(runMinimal.VERSION).toBeDefined();
    expect(runMinimal.DEFAULTS).toBeDefined();
    expect(runMinimal.HELP).toBeDefined();
    expect(typeof runMinimal.formatDuration).toBe("function");
    expect(typeof runMinimal.formatOutput).toBe("function");
    expect(typeof runMinimal.tailOutput).toBe("function");
    expect(typeof runMinimal.parseBoolean).toBe("function");
    expect(typeof runMinimal.parseMaxOutput).toBe("function");
    expect(typeof runMinimal.parseExitCode).toBe("function");
    expect(typeof runMinimal.readConfig).toBe("function");
    expect(typeof runMinimal.parseArgs).toBe("function");
    expect(typeof runMinimal.runCommand).toBe("function");
    expect(typeof runMinimal.runMinimal).toBe("function");
    expect(typeof runMinimal.runCli).toBe("function");
  });
});
