import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { execa } from "execa";
import { z } from "zod";

import { createSafeExecutionEnv } from "./safe-env";

const TASK_REGISTRY_PATH = fileURLToPath(
  import.meta.resolve("@shipskip/tasks/task-registry.json"),
);
const TASK_PACKAGE_ROOT = path.dirname(TASK_REGISTRY_PATH);

const TaskRegistryEntrySchema = z.object({
  template: z.string(),
  systemPrompt: z.string(),
  prompt: z.string(),
});

const TaskRegistrySchema = z.record(z.string(), TaskRegistryEntrySchema);

export type TaskRegistry = z.infer<typeof TaskRegistrySchema>;

export async function getTaskRegistry(): Promise<TaskRegistry> {
  const text = await fs.readFile(TASK_REGISTRY_PATH, "utf8");

  return TaskRegistrySchema.parse(JSON.parse(text));
}

export async function getPrompt(promptPath: string): Promise<string> {
  const filePath = resolveTaskAssetPath(promptPath);

  return fs.readFile(filePath, "utf8");
}

export async function scaffoldTemplate(
  templatePath: string,
  destination: string,
) {
  const source = resolveTaskAssetPath(templatePath);
  const target = path.resolve(destination);

  await fs.rm(target, { recursive: true, force: true });

  await fs.mkdir(path.dirname(target), { recursive: true });

  await fs.cp(source, target, {
    recursive: true,
    errorOnExist: true,
  });

  await execa("git", ["init"], { cwd: target });
  await execa("git", ["add", "."], { cwd: target });

  await execa("git", ["commit", "-m", "Initial commit"], { cwd: target });
}

function resolveTaskAssetPath(assetPath: string) {
  const resolvedPath = path.resolve(TASK_PACKAGE_ROOT, assetPath);
  const relativePath = path.relative(TASK_PACKAGE_ROOT, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Task asset path escapes package: ${assetPath}`);
  }

  return resolvedPath;
}

export async function buildApp(
  sessionDir: string,
  appDir: string,
  templatePath: string,
) {
  const target = getTemplateBuildScriptPath(templatePath);

  await execa(target, [sessionDir], {
    cwd: appDir,
    env: createSafeExecutionEnv(),
    extendEnv: false,
  });
}

export function getTemplateBuildScriptPath(templatePath: string) {
  return resolveTaskAssetPath(path.join(templatePath, "build.sh"));
}
