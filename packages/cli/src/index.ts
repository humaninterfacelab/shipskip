#!/usr/bin/env bun

import { Command } from "commander";

import packageJson from "../package.json";
import { runCommand } from "./commands/run";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

const program = new Command();

program
  .name("shipskip")
  .description("Run shipskip tasks")
  .version(packageJson.version);

program.addCommand(runCommand);
program.parse();
