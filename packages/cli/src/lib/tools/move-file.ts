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

export async function createMoveFileTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    moveFile: tool({
      description:
        "Move or rename a single regular file inside the workspace. Refuses directories and symlinks.",
      inputSchema: z.object({
        from: z
          .string()
          .min(1)
          .describe("Workspace-relative source file path."),
        to: z
          .string()
          .min(1)
          .describe("Workspace-relative destination file path."),
        overwrite: z
          .boolean()
          .optional()
          .describe("Overwrite the destination file if it exists. Defaults to false."),
        createParentDirectories: z
          .boolean()
          .optional()
          .describe(
            "Create destination parent directories if they do not exist. Defaults to false.",
          ),
      }),
      execute: async ({ from, to, overwrite, createParentDirectories }) => {
        return await moveWorkspaceFile({
          workspaceRoot: resolvedWorkspaceRoot,
          from,
          to,
          overwrite: overwrite ?? false,
          createParentDirectories: createParentDirectories ?? false,
        });
      },
    }),
  };
}

type MoveWorkspaceFileOptions = {
  workspaceRoot: string;
  from: string;
  to: string;
  overwrite: boolean;
  createParentDirectories: boolean;
};

async function moveWorkspaceFile({
  workspaceRoot,
  from,
  to,
  overwrite,
  createParentDirectories,
}: MoveWorkspaceFileOptions): Promise<string> {
  assertSafeWorkspaceRoot(workspaceRoot, "move file");

  const source = resolveWorkspacePath(workspaceRoot, from);
  const destination = resolveWorkspacePath(workspaceRoot, to);

  if (source.absolutePath === destination.absolutePath) {
    return `Source and destination are the same path: ${from}`;
  }

  const sourceEntry = await fs.lstat(source.absolutePath).catch(() => null);

  if (!sourceEntry) {
    return `Source file does not exist: ${from}`;
  }

  if (sourceEntry.isSymbolicLink()) {
    return `Refusing to move symlink: ${from}`;
  }

  if (sourceEntry.isDirectory()) {
    return `Source path is a directory, not a file: ${from}`;
  }

  if (!sourceEntry.isFile()) {
    return `Source path exists but is not a regular file: ${from}`;
  }

  await assertRealPathInsideWorkspace(
    workspaceRoot,
    source.absolutePath,
    from,
    "source file",
  );

  const parentCheck = await ensureSafeDestinationParentDirectory({
    workspaceRoot,
    parentDirectory: path.dirname(destination.absolutePath),
    destinationPath: to,
    createParentDirectories,
  });

  if (!parentCheck.ok) {
    return parentCheck.error;
  }

  const destinationEntry = await fs.lstat(destination.absolutePath).catch(() => null);

  if (destinationEntry) {
    if (destinationEntry.isSymbolicLink()) {
      return `Refusing to overwrite symlink: ${to}`;
    }

    if (destinationEntry.isDirectory()) {
      return `Destination path is a directory, not a file: ${to}`;
    }

    if (!destinationEntry.isFile()) {
      return `Destination path exists but is not a regular file: ${to}`;
    }

    if (!overwrite) {
      return `Destination file already exists: ${to}. Use overwrite: true to replace it.`;
    }

    await assertRealPathInsideWorkspace(
      workspaceRoot,
      destination.absolutePath,
      to,
      "destination file",
    );
  }

  await fs.rename(source.absolutePath, destination.absolutePath);

  return destinationEntry
    ? `File moved: ${formatRelativePath(source.relativePath)} -> ${formatRelativePath(
        destination.relativePath,
      )} (overwrote existing file)`
    : `File moved: ${formatRelativePath(source.relativePath)} -> ${formatRelativePath(
        destination.relativePath,
      )}`;
}

async function ensureSafeDestinationParentDirectory({
  workspaceRoot,
  parentDirectory,
  destinationPath,
  createParentDirectories,
}: {
  workspaceRoot: string;
  parentDirectory: string;
  destinationPath: string;
  createParentDirectories: boolean;
}): Promise<
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const relativeParentPath = path.relative(workspaceRoot, parentDirectory);

  if (relativeParentPath.startsWith("..") || path.isAbsolute(relativeParentPath)) {
    return {
      ok: false,
      error: `Destination parent directory is outside the workspace for ${destinationPath}.`,
    };
  }

  const parts = relativeParentPath.split(path.sep).filter(Boolean);
  let currentPath = workspaceRoot;

  for (const part of parts) {
    currentPath = path.join(currentPath, part);

    const entry = await fs.lstat(currentPath).catch(() => null);

    if (entry) {
      if (entry.isSymbolicLink()) {
        return {
          ok: false,
          error: `Refusing to use symlink in destination parent path for ${destinationPath}.`,
        };
      }

      if (!entry.isDirectory()) {
        return {
          ok: false,
          error: `Destination parent path is not a directory for ${destinationPath}.`,
        };
      }

      await assertRealPathInsideWorkspace(
        workspaceRoot,
        currentPath,
        destinationPath,
        "destination parent directory",
      );

      continue;
    }

    if (!createParentDirectories) {
      return {
        ok: false,
        error: `Destination parent directory does not exist for ${destinationPath}. Use createParentDirectories: true to create it.`,
      };
    }

    await fs.mkdir(currentPath);

    await assertRealPathInsideWorkspace(
      workspaceRoot,
      currentPath,
      destinationPath,
      "created destination parent directory",
    );
  }

  return {
    ok: true,
  };
}
