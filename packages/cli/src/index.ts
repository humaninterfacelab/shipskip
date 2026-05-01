#!/usr/bin/env bun

import { Command } from "commander";

import packageJson from "../package.json";
import { runCommand } from "./commands/run";

process.stderr.write(
  "Warning: shipskip can read files and execute commands. Use it only for development and in isolated environments.\n",
);

const program = new Command();

program
  .name("shipskip")
  .description("Run shipskip frontend tasks")
  .version(packageJson.version);

program.addCommand(runCommand);

program.parse();
