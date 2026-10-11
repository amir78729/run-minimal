# run-minimal

[![npm version](https://img.shields.io/npm/v/run-minimal.svg)](https://www.npmjs.com/package/run-minimal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/amir78729/run-minimal)

> Minimize successful command output to dramatically reduce AI agent token usage when running test, lint, typecheck, and formatting commands.

---

## 💡 Why run-minimal?

When building software with AI coding agents (such as Claude, Codex, Cursor, Antigravity, or Copilot), running verification commands like `npm test`, `eslint .`, `prettier --check .`, or `tsc` frequently dumps hundreds or thousands of lines of output into the terminal.

Even when the command passes completely:

- Passing test summaries and checkmarks flood the agent's context window.
- Token consumption skyrockets, exhausting context windows and driving up LLM inference costs.
- Valuable context needed for code generation and reasoning is crowded out.

**`run-minimal` solves this:**

- **On success:** Suppresses all stdout/stderr and prints a single concise summary line:
  ```bash
  ✓ vitest run passed (1.24s)
  ```
- **On failure:** Outputs the failure notice and surfaces the command's error output (with optional tail truncation) so the AI agent has the exact diagnostic information it needs to self-correct.
- **Exit codes:** Preserves the underlying command's exit code by default, ensuring CI pipelines, git hooks, and agent tool-runners behave as expected.

---

## 📦 Installation

### Global

```bash
# Using npm
npm install -g run-minimal

# Using pnpm
pnpm add -g run-minimal
```

### Local Dev Dependency

```bash
# Using pnpm
pnpm add -D run-minimal

# Using npm
npm install --save-dev run-minimal
```

### Run Directly via `npx` / `pnpx`

```bash
npx run-minimal <command>
# or
pnpm dlx run-minimal <command>
```

---

## 🚀 Usage

Simply prepend `run-minimal` before any shell command:

```bash
# Run tests
run-minimal vitest run

# Run linter
run-minimal eslint .

# Run TypeScript typechecker
run-minimal tsc --noEmit

# Run code formatter check
run-minimal prettier --check .
```

### Integration in `package.json`

Add `run-minimal` to your project's npm scripts so AI agents running them produce minimal token footprints:

```json
{
  "scripts": {
    "test": "run-minimal vitest run",
    "lint": "run-minimal eslint .",
    "typecheck": "run-minimal tsc --noEmit",
    "check": "run-minimal eslint . && run-minimal tsc --noEmit && run-minimal vitest run"
  }
}
```

---

## ⚙️ CLI Options

| Option                 | Description                                                 | Default      |
| ---------------------- | ----------------------------------------------------------- | ------------ |
| `--color`              | Enable ANSI colored output (`✓` green, `✗` red)             | `true`       |
| `--no-color`           | Disable ANSI color codes                                    | `false`      |
| `--duration`           | Show execution duration in milliseconds/seconds             | `true`       |
| `--no-duration`        | Hide execution duration                                     | `false`      |
| `--max-output <chars>` | Keep only the last `N` failure characters (`0` = unlimited) | `0`          |
| `--exit-code <mode>`   | Strategy for exit codes: `"preserve"` or `"generic"`        | `"preserve"` |
| `--help`               | Show help and usage instructions                            | —            |
| `--version`            | Display current package version                             | —            |
| `--`                   | Stop option parsing; all subsequent items are commands      | —            |

### Option Examples

```bash
# Limit failure output to the last 2000 characters
run-minimal --max-output 2000 vitest run

# Disable colors in raw log environments
run-minimal --no-color npm test

# Hide duration timing
run-minimal --no-duration eslint .

# Map any failure to exit code 1
run-minimal --exit-code generic npm test

# Forward command flags using '--'
run-minimal --no-color -- vitest --run --reporter=verbose
```

---

## 🔧 Configuration via `package.json`

You can configure persistent defaults in your project's `package.json` under the `"run-minimal"` key:

```json
{
  "name": "my-project",
  "run-minimal": {
    "color": true,
    "duration": true,
    "maxOutput": 4000,
    "exitCode": "preserve"
  }
}
```

CLI flags override settings defined in `package.json`.

---

## 💻 Programmatic API

`run-minimal` also exports TypeScript/ESM functions for programmatic use:

```typescript
import { runMinimal, runCommand, readConfig, formatDuration } from "run-minimal";

// Run a command with custom options
const result = await runMinimal(["--no-color", "npm", "test"], {
  cwd: process.cwd(),
  stdout: (msg) => console.log(msg),
  stderr: (msg) => console.error(msg),
});

console.log("Success:", result.success);
console.log("Exit code:", result.exitCode);
console.log("Duration (ms):", result.duration);
```

### Exported Types

- `Config`: Configuration schema.
- `ExitCodeMode`: `"preserve" | "generic"`.
- `ParsedArgs`: Result of CLI argument parsing.
- `CommandResult`: Raw output and status from `runCommand`.
- `RunMinimalOptions`: Custom streams, working directory, and environment overrides.
- `RunMinimalResult`: Complete execution result object.

---

## 🔄 Versioning & Release (Changesets & GitHub Actions)

This repository uses [Changesets](https://github.com/changesets/changesets) and GitHub Actions for automated versioning, changelog generation, and npm releases.

### Available Scripts

- `pnpm changeset:create` (or `pnpm changeset`): Interactively create a new changeset file.
- `pnpm changeset:check`: Verify whether changed packages have an associated changeset.
- `pnpm changeset:empty`: Create an empty changeset for changes that don't need a version bump.
- `pnpm changeset:version`: Consume changesets, update `package.json` versions, and update `CHANGELOG.md`.
- `pnpm changeset:release`: Build the package and publish it to the npm registry.

### Automated Release Workflow

1. **Pull Requests:** When branches are opened against `main`, the [CI workflow](.github/workflows/ci.yml) validates TypeScript builds, runs `oxfmt` formatting checks, runs `oxlint` linting, enforces 100% test coverage with `vitest`, and verifies changeset status.
2. **Version PR:** When a branch containing changesets is merged into `main`, the [Release workflow](.github/workflows/release.yml) automatically opens or updates a **"chore: version packages"** Release Pull Request.
3. **NPM Release:** Merging the Release PR into `main` automatically triggers the npm publish job, publishing the new version to the npm registry.

---

## 🧪 Testing & Development

### Requirements

- Node.js >= 18
- pnpm

### Commands

```bash
# Install dependencies
pnpm install

# Run TypeScript compilation
pnpm run build

# Run linter (oxlint)
pnpm run lint

# Format code with oxfmt
pnpm run format

# Check formatting (oxfmt)
pnpm run format:check

# Run unit tests (vitest)
pnpm run test

# Run tests and verify 100% test coverage
pnpm run test:coverage
```

This package maintains **100% test coverage** across all statements, branches, functions, and lines.

---

## 📄 License

[MIT](LICENSE) © [Amirhossein Alibakhshi](https://github.com/amir78729)
