import fs from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import {
  assertRealPathInsideWorkspace,
  assertSafeWorkspaceRoot,
  formatRelativePath,
  resolveWorkspacePath,
} from "../workspace";

export async function createDeleteFileTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    deleteFile: tool({
      description:
        "Delete a single regular file inside the workspace. Refuses directories and symlinks.",
      inputSchema: z.object({
        path: z
          .string()
          .min(1)
          .describe("Workspace-relative file path to delete."),
      }),
      execute: async ({ path: filePath }) => {
        return await deleteWorkspaceFile({
          workspaceRoot: resolvedWorkspaceRoot,
          filePath,
        });
      },
    }),
  };
}

type DeleteWorkspaceFileOptions = {
  workspaceRoot: string;
  filePath: string;
};

async function deleteWorkspaceFile({
  workspaceRoot,
  filePath,
}: DeleteWorkspaceFileOptions): Promise<string> {
  assertSafeWorkspaceRoot(workspaceRoot, "delete file");

  const { absolutePath, relativePath } = resolveWorkspacePath(
    workspaceRoot,
    filePath,
  );

  const entry = await fs.lstat(absolutePath).catch(() => null);

  if (!entry) {
    return `File does not exist: ${filePath}`;
  }

  if (entry.isSymbolicLink()) {
    return `Refusing to delete symlink: ${filePath}`;
  }

  if (entry.isDirectory()) {
    return `Path is a directory, not a file: ${filePath}`;
  }

  if (!entry.isFile()) {
    return `Path exists but is not a regular file: ${filePath}`;
  }

  await assertRealPathInsideWorkspace(
    workspaceRoot,
    absolutePath,
    filePath,
    "file",
  );

  await fs.unlink(absolutePath);

  return `File deleted: ${formatRelativePath(relativePath)}`;
}
