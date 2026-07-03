import fs from "node:fs";
import path from "node:path";

import { Command } from "commander";

import { attachSessionLogging } from "../run/logging";
import { resolveModelString } from "../run/model";
import { buildAgentSession, exportSession } from "../run/session";
import {
  assertWorkspaceChanged,
  buildArtifact,
  exportWorkspaceCode,
  initWorkspaceGit,
  loadTaskResources,
  scaffoldWorkspace,
} from "../run/task";
import { createSessionDirectories } from "../run/workspace";

type RunOptions = {
  task: string;
  model: string;
  output: string;
};

const runAction = async (options: RunOptions) => {
  const { provider, modelId } = resolveModelString(options.model);

  const outputDir = path.resolve(options.output);

  fs.mkdirSync(outputDir, { recursive: true });

  const { sessionRootDir, workspaceDir } = createSessionDirectories();

  const { task, tasksDir, systemPrompt, userPrompt } = loadTaskResources(
    options.task,
  );

  process.stderr.write(
    [
      `Shipskip session: ${sessionRootDir}`,
      `Task: ${task.title}`,
      `Model: ${provider}/${modelId}`,
      "",
    ].join("\n"),
  );

  scaffoldWorkspace(workspaceDir, tasksDir, task.template);
  await initWorkspaceGit(workspaceDir);

  const { session } = await buildAgentSession({
    workspaceDir,
    sessionRootDir,
    systemPrompt,
    provider,
    modelId,
  });

  attachSessionLogging(session);

  await session.prompt(userPrompt);

  await assertWorkspaceChanged(workspaceDir);

  await exportSession(session, sessionRootDir, outputDir);

  await exportWorkspaceCode(workspaceDir, outputDir);

  session.dispose();

  await buildArtifact(workspaceDir, outputDir);
};

export const runCommand = new Command("run")
  .description("Run a shipskip frontend task")
  .requiredOption(
    "-t, --task <string>",
    "task name (e.g. 'next-app/saas-landing-page')",
  )
  .requiredOption("-m, --model <string>", "model as 'provider/modelId'")
  .requiredOption(
    "-o, --output <dir>",
    "output directory for the build artifact",
  )
  .action(runAction);
