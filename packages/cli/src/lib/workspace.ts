import { execFile } from "node:child_process";
import fs from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function resolveWorkspacePath(
  workspaceRoot: string,
  targetPath: string,
) {
  const resolvedPath = path.resolve(workspaceRoot, targetPath);
  const relativePath = path.relative(workspaceRoot, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Path must be inside workspace: ${targetPath}`);
  }

  return {
    absolutePath: resolvedPath,
    relativePath: relativePath || ".",
  };
}

export async function resolveExistingWorkspaceFile(
  workspaceRoot: string,
  filePath: string,
) {
  const { absolutePath, relativePath } = resolveWorkspacePath(
    workspaceRoot,
    filePath,
  );

  const realWorkspaceRoot = await realpath(workspaceRoot);
  const realFilePath = await realpath(absolutePath);
  const realRelativePath = path.relative(realWorkspaceRoot, realFilePath);

  if (realRelativePath.startsWith("..") || path.isAbsolute(realRelativePath)) {
    throw new Error(`Resolved file must be inside workspace: ${filePath}`);
  }

  return {
    absolutePath: realFilePath,
    relativePath,
  };
}

export async function resolveExistingWorkspaceDirectory(
  workspaceRoot: string,
  directoryPath: string,
) {
  const { absolutePath, relativePath } = resolveWorkspacePath(
    workspaceRoot,
    directoryPath,
  );
  const stats = await stat(absolutePath).catch(() => null);

  if (!stats) {
    throw new Error(`Directory does not exist: ${directoryPath}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${directoryPath}`);
  }

  await assertRealPathInsideWorkspace(
    workspaceRoot,
    absolutePath,
    directoryPath,
    "directory",
  );

  return {
    absolutePath: await realpath(absolutePath),
    relativePath,
  };
}

export async function assertRealPathInsideWorkspace(
  workspaceRoot: string,
  absolutePath: string,
  targetPath: string,
  kind = "path",
) {
  const realWorkspaceRoot = await realpath(workspaceRoot);
  const realPath = await realpath(absolutePath);
  const realRelativePath = path.relative(realWorkspaceRoot, realPath);

  if (realRelativePath.startsWith("..") || path.isAbsolute(realRelativePath)) {
    throw new Error(`Resolved ${kind} must be inside workspace: ${targetPath}`);
  }
}

export function formatRelativePath(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}

export function assertSafeWorkspaceRoot(
  workspaceRoot: string,
  operation = "operate",
) {
  if (!path.isAbsolute(workspaceRoot)) {
    throw new Error(`Workspace root must be absolute: ${workspaceRoot}`);
  }

  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(`Workspace path does not exist: ${workspaceRoot}`);
  }

  const root = path.parse(workspaceRoot).root;
  if (workspaceRoot === root) {
    throw new Error(`Refusing to ${operation} at filesystem root.`);
  }
}

export async function initializeWorkspaceGitRepository(workspacePath: string) {
  await runGit(workspacePath, ["init", "-b", "main"]);
  await runGit(workspacePath, ["add", "."]);
  await runGit(
    workspacePath,
    ["commit", "--allow-empty", "-m", "Initial workspace"],
    {
      GIT_AUTHOR_NAME: "shipskip",
      GIT_AUTHOR_EMAIL: "shipskip@example.com",
      GIT_COMMITTER_NAME: "shipskip",
      GIT_COMMITTER_EMAIL: "shipskip@example.com",
    },
  );
}

async function runGit(
  workspacePath: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
) {
  await execFileAsync("git", args, {
    cwd: workspacePath,
    env: {
      ...process.env,
      ...env,
    },
  });
}
