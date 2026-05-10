#!/usr/bin/env bun

import { Command } from "commander";

import packageJson from "../package.json";
import { runCommand } from "./commands/run";
import { getLogger } from "./lib/logger";
import { createSession, getSessionDir } from "./lib/session";

process.on("unhandledRejection", (reason) => {
  getLogger().error({ err: reason }, "Unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  getLogger().error({ err: error }, "Uncaught exception");
  process.exit(1);
});

const program = new Command();

program
  .name("shipskip")
  .description("Run shipskip frontend tasks")
  .version(packageJson.version);

program.addCommand(runCommand);

program.hook("preAction", () => {
  createSession();

  const logger = getLogger();
  const sessionDir = getSessionDir();

  logger.warn(
    "shipskip CLI can read files and execute commands. Use it in isolated environments.",
  );

  logger.info({ sessionDir }, "Session started");
});

program.parse();
