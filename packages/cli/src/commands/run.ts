import path from "node:path";

import { isLoopFinished, ToolLoopAgent } from "ai";
import { Command } from "commander";
import pc from "picocolors";

import { compactMessages, getEstimatedTokens } from "../lib/compact-messages";
import { getContextLength } from "../lib/context";
import { getLogger } from "../lib/logger";
import { getModel } from "../lib/model";
import { getSessionDir } from "../lib/session";
import {
  buildApp,
  getPrompt,
  getTaskRegistry,
  scaffoldTemplate,
} from "../lib/task";
import { createCrudFileTools } from "../lib/tools/crud-files";
import { createGitTool } from "../lib/tools/git";
import { createGlobTool } from "../lib/tools/glob";
import { createRipgrepTool } from "../lib/tools/ripgrep";
import { createRunScriptTool } from "../lib/tools/run-script";
import { truncate } from "../lib/utils";

type RunOptions = {
  task: string;
  model: string;
};

const TOTAL_AGENT_TIMEOUT_MS = 30 * 60_000;
const CONTEXT_THRESHOLD = 0.5;

function createTools(appDir: string) {
  return {
    ...createCrudFileTools(appDir),
    ...createGitTool(appDir),
    ...createGlobTool(appDir),
    ...createRipgrepTool(appDir),
    ...createRunScriptTool(appDir),
  };
}

async function resolveTask(taskName: string) {
  const registry = await getTaskRegistry();
  const task = registry[taskName];

  if (!task) {
    throw new Error(`Unknown task: ${taskName}`);
  }

  const [prompt, systemPrompt] = await Promise.all([
    getPrompt(task.prompt),
    getPrompt(task.systemPrompt),
  ]);

  return { task, prompt, systemPrompt };
}

const runAction = async (options: RunOptions) => {
  const logger = getLogger();

  try {
    logger.info({ task: options.task, model: options.model }, "Run started");

    const sessionDir = getSessionDir();
    const appDir = path.join(sessionDir, "app");

    logger.debug({ sessionDir, appDir }, "Resolved session directories");

    const { task, prompt, systemPrompt } = await resolveTask(options.task);

    logger.info(
      { task: options.task, template: task.template },
      "Task resolved",
    );

    logger.debug({ prompt, systemPrompt }, "Prompts resolved");

    const modelId = options.model.trim();

    logger.info({ modelId }, "Model resolved");

    const model = getModel(modelId);

    const contextLength = await getContextLength(modelId);
    if (contextLength) {
      logger.info({ contextLength }, "Context length resolved");
    } else logger.warn("Unable to resolve context length");

    logger.info({ template: task.template, appDir }, "Scaffolding template");
    await scaffoldTemplate(task.template, appDir);
    logger.info({ template: task.template, appDir }, "Template scaffolded");

    const tools = createTools(appDir);
    logger.debug({ tools: Object.keys(tools) }, "Agent tools created");

    const agent = new ToolLoopAgent({
      model,
      instructions: systemPrompt,
      maxRetries: 5,
      tools,
      stopWhen: isLoopFinished(),
      prepareStep: async ({ messages, model }) => {
        if (!contextLength) return {};

        const estimatedTokens = getEstimatedTokens(messages);
        const compactThreshold = Math.ceil(contextLength * CONTEXT_THRESHOLD);

        if (estimatedTokens < compactThreshold) return {};

        logger.info(
          { estimatedTokens, contextLength, compactThreshold },
          "Compacting messages",
        );

        try {
          const compactedMessages = await compactMessages(messages, {
            summarizerModel: model,
          });

          logger.trace({ compactMessages });

          return {
            messages: compactedMessages,
          };
        } catch (error) {
          logger.error({ error }, "Failed to compact messages");
          return {};
        }
      },
    });

    logger.info(
      {
        maxRetries: 5,
        timeoutMs: TOTAL_AGENT_TIMEOUT_MS,
      },
      "Agent created",
    );

    const result = await agent.stream({
      prompt,
      timeout: { totalMs: TOTAL_AGENT_TIMEOUT_MS },
    });

    logger.info("Agent stream started");

    let currentPartType = "";

    for await (const part of result.fullStream) {
      logger.trace({ part }, "Agent stream event");

      if (currentPartType !== part.type) {
        process.stderr.write("\n");
        currentPartType = part.type;
      }

      switch (part.type) {
        case "text-delta": {
          process.stdout.write(part.text);
          break;
        }

        case "reasoning-delta": {
          process.stderr.write(pc.dim(part.text));
          break;
        }

        case "tool-call": {
          const toolName = part.toolName ?? "unknown";
          const input = truncate(JSON.stringify(part.input ?? "unknown"));
          process.stderr.write(pc.yellow(`Tool call: ${toolName}`));
          process.stderr.write(pc.dim(`\nInput: ${input}`));
          break;
        }

        case "tool-result": {
          const result = truncate(JSON.stringify(part.output ?? "unknown"));
          process.stderr.write(pc.dim(`Output: ${result}`));
          break;
        }

        case "finish": {
          logger.info({ usage: part.totalUsage });
          break;
        }

        case "error": {
          process.stderr.write(
            pc.red(JSON.stringify(part.error ?? "Unknown Error")),
          );
          throw part.error;
        }
      }
    }

    logger.info("Agent stream closed");

    logger.info({ sessionDir, appDir }, "Building app");
    await buildApp(sessionDir, appDir);
    logger.info("App built");

    logger.info("Run completed");
  } catch (error) {
    logger.error({ err: error }, "Execution failed");
    process.exitCode = 1;
  }
};

export const runCommand = new Command("run")
  .description(
    "Run a shipskip frontend task from instructions, prompt, and template files",
  )
  .requiredOption(
    "-t, --task <string>",
    "shipskip task from @shipskip/tasks, such as 'next-app/saas-landing-page'",
  )
  .requiredOption(
    "-m, --model <string>",
    "exact OpenRouter model id, such as 'qwen/qwen3-coder:free'",
  )
  .action(runAction);
