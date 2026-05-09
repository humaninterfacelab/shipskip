import path from "node:path";

import { isLoopFinished, ToolLoopAgent } from "ai";
import { Command } from "commander";
import { consola } from "consola";
import * as c from "yoctocolors";

import { compactMessages, getEstimatedTokens } from "../lib/compact-messages";
import { getContextLength } from "../lib/context";
import { getLogger } from "../lib/logger";
import { getModel, parseModelProfile } from "../lib/model";
import { getSessionDir } from "../lib/session";
import {
  buildApp,
  getPrompt,
  getTaskRegistry,
  scaffoldTemplate,
} from "../lib/task";
import { createCrudFileTools } from "../lib/tools/crud-files";
import { createGitTool } from "../lib/tools/git";
import { createListFileTool } from "../lib/tools/list-files";
import { createRipgrepTool } from "../lib/tools/ripgrep";
import { createRunScriptTool } from "../lib/tools/run-script";
import { summarizeValue, truncate } from "../lib/utils";

type RunOptions = {
  task: string;
  model: string;
};

const TOTAL_AGENT_TIMEOUT_MS = 30 * 60_000;
const CONTEXT_THRESHOLD = 0.7;

async function createTools(appDir: string) {
  return {
    tools: {
      ...createCrudFileTools(appDir),
      ...createGitTool(appDir),
      ...createListFileTool(appDir),
      ...createRipgrepTool(appDir),
      ...createRunScriptTool(appDir),
    },
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
    consola.start(c.bold("Running shipskip task"));
    logger.info({ task: options.task, model: options.model }, "Run started");

    const sessionDir = getSessionDir();
    const appDir = path.join(sessionDir, "app");

    logger.debug({ sessionDir, appDir }, "Resolved run directories");

    const { task, prompt, systemPrompt } = await resolveTask(options.task);

    consola.info(
      `${c.bold(options.task)} ${c.dim("using template")} ${c.cyan(task.template)}`,
    );
    consola.debug(`${c.dim("prompt")} ${truncate(prompt, 150)}`);
    consola.debug(`${c.dim("system")} ${truncate(systemPrompt, 150)}`);

    logger.info(
      {
        task: options.task,
        template: task.template,
      },
      "Task resolved",
    );

    logger.debug(
      {
        promptLength: prompt.length,
        systemPromptLength: systemPrompt.length,
      },
      "Prompts resolved",
    );

    const { provider, modelName, reasoning } = parseModelProfile(options.model);

    consola.info(
      `${c.bold(provider)}/${modelName}${reasoning ? c.dim(`#${reasoning}`) : ""}`,
    );

    logger.info({ provider, modelName, reasoning }, "Model resolved");

    const { model, providerOptions } = getModel(provider, modelName, reasoning);

    logger.debug({ providerOptions }, "Provider options resolved");

    const contextLength = await getContextLength(provider, modelName);
    if (contextLength)
      logger.info({
        contextLength,
        threshold: contextLength * CONTEXT_THRESHOLD,
      });
    else logger.warn("Unable to resolve context length");

    consola.info(`Scaffolding ${c.cyan(task.template)}`);

    logger.debug({ template: task.template, appDir }, "Scaffolding template");
    await scaffoldTemplate(task.template, appDir);

    logger.info({ template: task.template }, "Template scaffolded");

    const { tools } = await createTools(appDir);

    logger.debug({ tools: Object.keys(tools) }, "Agent tools created");

    const agent = new ToolLoopAgent({
      model,
      providerOptions,
      instructions: systemPrompt,
      maxRetries: 5,
      stopWhen: isLoopFinished(),
      tools,
      prepareStep: async ({ messages, model }) => {
        if (!contextLength) return {};

        const estimatedTokens = getEstimatedTokens(messages);
        const compactThreshold = contextLength * CONTEXT_THRESHOLD;

        if (estimatedTokens < compactThreshold) {
          return {};
        }

        logger.debug(
          {
            estimatedTokens,
            contextLength,
            threshold: CONTEXT_THRESHOLD,
            compactThreshold,
          },
          "Compacting messages",
        );

        try {
          const compactedMessages = await compactMessages(messages, {
            summarizerModel: model,
          });

          consola.info(
            `${c.bold("Compacted messages")} ${c.dim(
              `${messages.length} -> ${compactedMessages.length} messages`,
            )}`,
          );

          logger.info(
            {
              beforeCount: messages.length,
              afterCount: compactedMessages.length,
              estimatedTokensBefore: estimatedTokens,
              estimatedTokensAfter: getEstimatedTokens(compactedMessages),
            },
            "Compacted messages",
          );

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
    consola.info(
      `Agent created ${c.dim(`timeout ${TOTAL_AGENT_TIMEOUT_MS / 60_000}m`)}`,
    );

    const result = await agent.stream({
      prompt,
      timeout: { totalMs: TOTAL_AGENT_TIMEOUT_MS },
    });

    logger.debug("Agent stream started");

    let outputType = "";
    for await (const part of result.fullStream) {
      logger.trace({ part }, "Agent stream event");

      if (outputType !== part.type) {
        process.stdout.write("\n");
        outputType = part.type;
      }

      switch (part.type) {
        case "text-delta": {
          logger.trace({ text: part.text }, "text-delta");
          process.stdout.write(part.text);
          break;
        }

        case "reasoning-delta": {
          logger.trace({ text: part.text }, "reasoning-delta");
          process.stdout.write(c.dim(part.text));
          break;
        }

        case "tool-call": {
          const toolName = part.toolName ?? "unknown";

          logger.debug({ toolName, input: part.input }, "tool-call");
          consola.info(
            `${c.bold(toolName)} ${c.dim(summarizeValue(part.input) ?? "")}`,
          );
          break;
        }

        case "tool-result": {
          const toolName = part.toolName ?? "unknown";

          logger.debug({ toolName, input: part.input }, "tool-result");
          consola.debug(
            `${c.bold(toolName)} ${c.dim(summarizeValue(part.input) ?? "")}`,
          );
          break;
        }

        case "finish-step": {
          logger.debug({ finishReason: part.finishReason }, "finish-step");
          consola.debug(`${c.dim("step finished")} ${part.finishReason}`);
          break;
        }

        case "finish": {
          consola.success(
            `\nAgent loop finished`,
            c.dim(summarizeValue(part.totalUsage) ?? ""),
          );
          logger.info({ usage: part.totalUsage }, "finish");
          break;
        }

        case "error": {
          logger.error({ err: part.error }, "Agent stream error");
          consola.error("Stream failed", part.error);
          throw part.error;
        }
      }
    }

    logger.debug("Agent stream closed");

    consola.info("Building app...");
    logger.debug({ sessionDir, appDir }, "Building app");
    await buildApp(sessionDir, appDir);
    logger.info("App built");

    logger.info("Run completed");

    consola.success(c.bold("Task completed!"));
  } catch (error) {
    consola.error("Execution failed", error);
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
    "model profile eg. 'openai/gpt-5.5', 'openai/gpt-5.5#high', or 'openrouter/meta-llama/llama-3.1-8b-instruct:free#high'",
  )
  .action(runAction);
