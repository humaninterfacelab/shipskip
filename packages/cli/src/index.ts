#!/usr/bin/env bun

import { Command } from "commander";
import consola from "consola";
import * as c from "yoctocolors";

import packageJson from "../package.json";
import { runCommand } from "./commands/run";
import { getLogger } from "./lib/logger";
import { createSession, getSessionDir } from "./lib/session";

process.on("unhandledRejection", (reason) => {
  consola.error("Unhandled rejection", reason);
  getLogger().error({ err: reason }, "Unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  consola.error("Uncaught exception", error);
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

  consola.box(`${c.bold("shipskip")}\n\n${c.dim("session")}  ${sessionDir}`);

  consola.warn(
    "shipskip CLI can read files and execute commands. Use it in isolated environments.",
  );

  logger.info({ sessionDir }, "Session started");
});

program.parse();
