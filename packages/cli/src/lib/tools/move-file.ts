import type { Stats } from "node:fs";
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

  const sourceCheck = validateSourceFile(sourceEntry, from);

  if (sourceCheck) {
    return sourceCheck;
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

  const destinationCheck = validateDestinationFile({
    destinationEntry,
    destinationPath: to,
    overwrite,
  });

  if (destinationCheck) {
    return destinationCheck;
  }

  if (destinationEntry) {
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

function validateSourceFile(
  sourceEntry: Stats | null,
  sourcePath: string,
): string | null {
  if (!sourceEntry) {
    return `Source file does not exist: ${sourcePath}`;
  }

  if (sourceEntry.isSymbolicLink()) {
    return `Refusing to move symlink: ${sourcePath}`;
  }

  if (sourceEntry.isDirectory()) {
    return `Source path is a directory, not a file: ${sourcePath}`;
  }

  return sourceEntry.isFile()
    ? null
    : `Source path exists but is not a regular file: ${sourcePath}`;
}

function validateDestinationFile({
  destinationEntry,
  destinationPath,
  overwrite,
}: {
  destinationEntry: Stats | null;
  destinationPath: string;
  overwrite: boolean;
}): string | null {
  if (!destinationEntry) {
    return null;
  }

  if (destinationEntry.isSymbolicLink()) {
    return `Refusing to overwrite symlink: ${destinationPath}`;
  }

  if (destinationEntry.isDirectory()) {
    return `Destination path is a directory, not a file: ${destinationPath}`;
  }

  if (!destinationEntry.isFile()) {
    return `Destination path exists but is not a regular file: ${destinationPath}`;
  }

  return overwrite
    ? null
    : `Destination file already exists: ${destinationPath}. Use overwrite: true to replace it.`;
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
