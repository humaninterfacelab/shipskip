import { cp, readFile } from "node:fs/promises";
import path from "node:path";

import { stepCountIs, ToolLoopAgent } from "ai";
import { Command } from "commander";

import { createLogger } from "../lib/logger";
import { getModel, parseModelProfile } from "../lib/model";
import {
  createSession,
  formatSessionArtifacts,
  type Session,
} from "../lib/session";
import { createApplyPatchTool } from "../lib/tools/apply-patch";
import { createCreateFileTool } from "../lib/tools/create-file";
import { createDeleteFileTool } from "../lib/tools/delete-file";
import { createFindFilesTool } from "../lib/tools/find-files";
import { createGetDiffTool } from "../lib/tools/get-diff";
import { createListDirectoryTool } from "../lib/tools/list-directories";
import { createMoveFileTool } from "../lib/tools/move-file";
import { createReadFileTool } from "../lib/tools/read-files";
import { createRunCommandTool } from "../lib/tools/run-command";
import { createSearchCodeTool } from "../lib/tools/search-code";
import { truncateText } from "../lib/utils";
import { initializeWorkspaceGitRepository } from "../lib/workspace";

const MAX_LOG_VALUE_LENGTH = 4_000;
const TOTAL_AGENT_TIMEOUT_MS = 10 * 60_000;

type RunOptions = {
  instructions: string;
  prompt: string;
  template: string;
  model: string;
};

const runAction = async function (options: RunOptions) {
  let session: Session | undefined;
  let logger: ReturnType<typeof createLogger> | undefined;

  try {
    session = await createSession();
    logger = createLogger(session.logPath);
    logger.info({ session }, "Running task");

    const templatePath = path.resolve(options.template);

    logger.info("Creating temporary workspace for the agent...");
    const workspacePath = session.workspacePath;
    await cp(templatePath, workspacePath, {
      recursive: true,
    });
    await initializeWorkspaceGitRepository(workspacePath);
    logger.info(`Workspace created at: ${workspacePath}`);

    const [instructions, prompt] = await Promise.all([
      readFile(path.resolve(options.instructions), "utf8"),
      readFile(path.resolve(options.prompt), "utf8"),
    ]);

    logger.debug(`Instructions: ${formatLogValue(instructions)}`);
    logger.debug(`Prompt: ${formatLogValue(prompt)}`);

    const { provider, modelName, reasoning } = parseModelProfile(options.model);
    logger.debug({ provider, modelName, reasoning }, "Parsed model profile");

    const { model, providerOptions } = getModel(provider, modelName, reasoning);

    const applyPatch = await createApplyPatchTool(workspacePath);
    const createFile = await createCreateFileTool(workspacePath);
    const deleteFile = await createDeleteFileTool(workspacePath);
    const findFiles = await createFindFilesTool(workspacePath);
    const getDiff = await createGetDiffTool(workspacePath);
    const listDirectory = await createListDirectoryTool(workspacePath);
    const moveFile = await createMoveFileTool(workspacePath);
    const readFileTool = await createReadFileTool(workspacePath);
    const runCommand = await createRunCommandTool(workspacePath);
    const searchCode = await createSearchCodeTool(workspacePath);

    const agent = new ToolLoopAgent({
      model,
      providerOptions,
      instructions,
      maxRetries: 5,
      stopWhen: stepCountIs(50),
      tools: {
        ...applyPatch,
        ...createFile,
        ...deleteFile,
        ...findFiles,
        ...getDiff,
        ...listDirectory,
        ...moveFile,
        ...readFileTool,
        ...runCommand,
        ...searchCode,
      },
    });

    const result = await agent.stream({
      prompt,
      timeout: { totalMs: TOTAL_AGENT_TIMEOUT_MS },
    });

    for await (const part of result.fullStream) {
      switch (part.type) {
        case "text-delta":
          process.stdout.write(part.text);
          break;

        case "reasoning-delta":
          logger.debug(formatLogValue(part.text));
          break;

        case "tool-call":
          logger.debug(
            { input: formatLogValue(part.input) },
            `Tool call: ${part.toolName}`,
          );
          break;

        case "tool-result":
          logger.debug(
            { output: formatLogValue(part.output) },
            `Tool result: ${part.toolName}`,
          );
          break;

        case "finish-step":
          logger.debug(`Finish step: ${part.finishReason}`);
          break;

        case "error":
          throw part.error;

        case "finish":
          logger.debug({ usage: part.totalUsage }, "Finished");
          break;
      }
    }

    process.stdout.write("\n");
  } catch (error) {
    if (logger) {
      logger.error(error);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    if (session) {
      process.stdout.write(`${formatSessionArtifacts(session)}\n`);
    }
  }
};

function formatLogValue(value: unknown) {
  if (typeof value === "string") {
    return truncateText(value, MAX_LOG_VALUE_LENGTH);
  }

  if (value instanceof Error) {
    return truncateText(value.stack ?? value.message, MAX_LOG_VALUE_LENGTH);
  }

  try {
    return truncateText(
      JSON.stringify(value, null, 2) ?? String(value),
      MAX_LOG_VALUE_LENGTH,
    );
  } catch {
    return truncateText(String(value), MAX_LOG_VALUE_LENGTH);
  }
}

export const runCommand = new Command("run")
  .description("Run a shipskip frontend task from instructions, prompt, and template files")
  .requiredOption("-i, --instructions <file>", "frontend task instructions file")
  .requiredOption("-p, --prompt <file>", "frontend task prompt file")
  .requiredOption(
    "-w, --template <dir>",
    "workspace template directory eg. 'templates/nextjs'",
  )
  .requiredOption(
    "-m, --model <string>",
    "model profile eg. 'openai/gpt-5.5', 'openai/gpt-5.5#high', or 'openrouter/meta-llama/llama-3.1-8b-instruct:free#high'",
  )
  .action(runAction);
