import { describe, expect, it } from "vitest";
import { formatDuration, formatOutput, tailOutput } from "../src/formatters.js";
import type { Config } from "../src/types.js";

describe("formatDuration", () => {
  it("formats durations less than 1000ms as integer milliseconds", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(12)).toBe("12ms");
    expect(formatDuration(999)).toBe("999ms");
    expect(formatDuration(450.4)).toBe("450ms");
  });

  it("formats durations between 1 second and 1 minute as seconds with two decimals", () => {
    expect(formatDuration(1000)).toBe("1.00s");
    expect(formatDuration(1550)).toBe("1.55s");
    expect(formatDuration(59990)).toBe("59.99s");
  });

  it("formats durations of 1 minute or longer as minutes and padded seconds", () => {
    expect(formatDuration(60000)).toBe("1m 00s");
    expect(formatDuration(65000)).toBe("1m 05s");
    expect(formatDuration(125000)).toBe("2m 05s");
    expect(formatDuration(3661000)).toBe("61m 01s");
  });
});

describe("formatOutput", () => {
  const baseConfig: Config = {
    color: true,
    duration: true,
    maxOutput: 0,
    exitCode: "preserve",
  };

  it("formats successful command with color and duration", () => {
    const result = formatOutput(true, "npm test", 1500, baseConfig);
    expect(result).toBe("\x1b[32m✓ npm test passed (1.50s)\x1b[0m");
  });

  it("formats failed command with color and duration", () => {
    const result = formatOutput(false, "npm test", 500, baseConfig);
    expect(result).toBe("\x1b[31m✗ npm test failed (500ms)\x1b[0m");
  });

  it("formats without color when color option is false", () => {
    const config: Config = { ...baseConfig, color: false };
    const result = formatOutput(true, "npm run build", 200, config);
    expect(result).toBe("✓ npm run build passed (200ms)");
  });

  it("formats without duration when duration option is false", () => {
    const config: Config = { ...baseConfig, color: false, duration: false };
    const result = formatOutput(false, "eslint .", 300, config);
    expect(result).toBe("✗ eslint . failed");
  });

  it("formats with color but without duration", () => {
    const config: Config = { ...baseConfig, color: true, duration: false };
    const result = formatOutput(true, "eslint .", 300, config);
    expect(result).toBe("\x1b[32m✓ eslint . passed\x1b[0m");
  });
});

describe("tailOutput", () => {
  it("returns original output if maxOutput is 0", () => {
    const text = "A".repeat(500);
    expect(tailOutput(text, 0)).toBe(text);
  });

  it("returns original output if length is less than maxOutput", () => {
    const text = "short output";
    expect(tailOutput(text, 50)).toBe(text);
  });

  it("returns original output if length is equal to maxOutput", () => {
    const text = "exact length";
    expect(tailOutput(text, text.length)).toBe(text);
  });

  it("truncates output and adds truncation prefix if length exceeds maxOutput", () => {
    const text = "1234567890";
    expect(tailOutput(text, 4)).toBe("… output truncated …\n7890");
  });
});
