#!/usr/bin/env node
/**
 * @file CLI binary entry point for `run-minimal`.
 */

import process from "node:process";
import { runCli } from "./runner.js";

const exitCode = await runCli();
process.exit(exitCode);
