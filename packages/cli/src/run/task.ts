import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import taskRegistry from "@shipskip/tasks/registry.json";
import consola from "consola";
import { execa } from "execa";

type Registry = typeof taskRegistry;
type DatasetId = keyof Registry;

function resolveTask(rawTaskString: string) {
  const [datasetId, taskId] = rawTaskString.split("/");

  if (!datasetId || !taskId) {
    throw new Error(`Invalid task: "${rawTaskString}"`);
  }

  const dataset = taskRegistry[datasetId as DatasetId];

  if (!dataset) {
    throw new Error(`Unknown dataset: "${datasetId}"`);
  }

  return dataset[taskId as keyof typeof dataset];
}

export function loadTaskResources(taskName: string) {
  const task = resolveTask(taskName);

  const tasksDir = path.dirname(
    fileURLToPath(import.meta.resolve("@shipskip/tasks/registry.json")),
  );

  const systemPrompt = fs.readFileSync(
    path.join(tasksDir, task.systemPrompt),
    "utf8",
  );

  const userPrompt = fs.readFileSync(path.join(tasksDir, task.prompt), "utf8");

  return {
    task,
    tasksDir,
    systemPrompt,
    userPrompt,
  };
}

export function scaffoldWorkspace(
  workspaceDir: string,
  tasksDir: string,
  template: string,
) {
  fs.cpSync(path.join(tasksDir, template), workspaceDir, {
    recursive: true,
  });
}

export async function initWorkspaceGit(workspaceDir: string) {
  await execa("git", ["init"], { cwd: workspaceDir });
  await execa("git", ["add", "-A"], { cwd: workspaceDir });
  await execa(
    "git",
    ["commit", "-m", "scaffold"],
    { cwd: workspaceDir },
  );
}

export async function assertWorkspaceChanged(workspaceDir: string) {
  const { stdout } = await execa("git", ["status", "--porcelain"], {
    cwd: workspaceDir,
  });
  if (!stdout.trim()) {
    throw new Error("Agent made no changes to the workspace. Aborting build.");
  }
}

export function exportWorkspaceCode(workspaceDir: string, outputDir: string) {
  const destDir = path.join(outputDir, "workspace");
  fs.cpSync(workspaceDir, destDir, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(workspaceDir, src);
      const parts = rel.split(path.sep);
      return !parts.some((p) => p === ".git" || p === "node_modules" || p === ".next");
    },
  });
}

export async function buildArtifact(workspaceDir: string, outputDir: string) {
  consola.start("Build started");
  await execa("./build.sh", [outputDir], {
    cwd: workspaceDir,
    stdio: "inherit",
  });
  consola.success("Build finished");
}
