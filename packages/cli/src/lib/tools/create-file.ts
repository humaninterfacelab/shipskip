import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import { MAX_READ_FILE_BYTES } from "../utils";
import {
  assertRealPathInsideWorkspace,
  assertSafeWorkspaceRoot,
  formatRelativePath,
  resolveWorkspacePath,
} from "../workspace";

const MAX_CREATE_FILE_BYTES = MAX_READ_FILE_BYTES;

export async function createCreateFileTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    createFile: tool({
      description:
        "Create a new workspace file with the provided content. Fails if the file already exists unless overwrite is true.",
      inputSchema: z.object({
        path: z
          .string()
          .min(1)
          .describe("Workspace-relative file path to create."),
        content: z.string().describe("File content to write."),
        overwrite: z
          .boolean()
          .optional()
          .describe(
            "Overwrite the file if it already exists. Defaults to false.",
          ),
        createParentDirectories: z
          .boolean()
          .optional()
          .describe(
            "Create parent directories if they do not exist. Defaults to false.",
          ),
      }),
      execute: async ({
        path: filePath,
        content,
        overwrite,
        createParentDirectories,
      }) => {
        return await createWorkspaceFile({
          workspaceRoot: resolvedWorkspaceRoot,
          filePath,
          content,
          overwrite: overwrite ?? false,
          createParentDirectories: createParentDirectories ?? false,
        });
      },
    }),
  };
}

type CreateWorkspaceFileOptions = {
  workspaceRoot: string;
  filePath: string;
  content: string;
  overwrite: boolean;
  createParentDirectories: boolean;
};

async function createWorkspaceFile({
  workspaceRoot,
  filePath,
  content,
  overwrite,
  createParentDirectories,
}: CreateWorkspaceFileOptions): Promise<string> {
  assertSafeWorkspaceRoot(workspaceRoot, "create file");

  const { absolutePath, relativePath } = resolveWorkspacePath(
    workspaceRoot,
    filePath,
  );

  const formattedPath = formatRelativePath(relativePath);
  const contentBytes = Buffer.byteLength(content, "utf8");

  if (contentBytes > MAX_CREATE_FILE_BYTES) {
    return `File content is too large to write: ${formattedPath} (${contentBytes} bytes).`;
  }

  const parentDirectory = path.dirname(absolutePath);

  const parentCheck = await ensureSafeParentDirectory({
    workspaceRoot,
    parentDirectory,
    relativePath,
    createParentDirectories,
  });

  if (!parentCheck.ok) {
    return parentCheck.error;
  }

  const existing = await fs.lstat(absolutePath).catch(() => null);

  const existingCheck = validateExistingFile({
    existing,
    formattedPath,
    overwrite,
  });

  if (existingCheck) {
    return existingCheck;
  }

  try {
    await fs.writeFile(absolutePath, content, {
      encoding: "utf8",
      flag: overwrite ? "w" : "wx",
    });
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      return `File already exists: ${formattedPath}. Use overwrite: true to replace it.`;
    }

    throw error;
  }

  const lineCount = countLines(content);

  return existing
    ? `File overwritten: ${formattedPath} (${contentBytes} bytes, ${lineCount} lines).`
    : `File created: ${formattedPath} (${contentBytes} bytes, ${lineCount} lines).`;
}

function validateExistingFile({
  existing,
  formattedPath,
  overwrite,
}: {
  existing: Stats | null;
  formattedPath: string;
  overwrite: boolean;
}): string | null {
  if (!existing) {
    return null;
  }

  if (existing.isSymbolicLink()) {
    return `Refusing to write through symlink: ${formattedPath}`;
  }

  if (existing.isDirectory()) {
    return `Path is a directory, not a file: ${formattedPath}`;
  }

  if (!existing.isFile()) {
    return `Path exists but is not a regular file: ${formattedPath}`;
  }

  return overwrite
    ? null
    : `File already exists: ${formattedPath}. Use overwrite: true to replace it.`;
}

async function ensureSafeParentDirectory({
  workspaceRoot,
  parentDirectory,
  relativePath,
  createParentDirectories,
}: {
  workspaceRoot: string;
  parentDirectory: string;
  relativePath: string;
  createParentDirectories: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const formattedPath = formatRelativePath(relativePath);
  const relativeParentPath = path.relative(workspaceRoot, parentDirectory);

  if (relativeParentPath === "") {
    await assertRealPathInsideWorkspace(
      workspaceRoot,
      parentDirectory,
      relativePath,
      "parent directory",
    );

    return { ok: true };
  }

  if (
    relativeParentPath.startsWith("..") ||
    path.isAbsolute(relativeParentPath)
  ) {
    return {
      ok: false,
      error: `Parent directory is outside the workspace for ${formattedPath}.`,
    };
  }

  const parts = relativeParentPath.split(path.sep).filter(Boolean);
  let currentPath = workspaceRoot;

  for (const part of parts) {
    currentPath = path.join(currentPath, part);

    const existing = await fs.lstat(currentPath).catch(() => null);
    const formattedCurrentPath = formatRelativePath(
      path.relative(workspaceRoot, currentPath),
    );

    if (existing) {
      if (existing.isSymbolicLink()) {
        return {
          ok: false,
          error: `Refusing to use symlink in parent path for ${formattedPath}: ${formattedCurrentPath}`,
        };
      }

      if (!existing.isDirectory()) {
        return {
          ok: false,
          error: `Parent path is not a directory for ${formattedPath}: ${formattedCurrentPath}`,
        };
      }

      await assertRealPathInsideWorkspace(
        workspaceRoot,
        currentPath,
        relativePath,
        "parent directory",
      );

      continue;
    }

    if (!createParentDirectories) {
      return {
        ok: false,
        error: `Parent directory does not exist for ${formattedPath}. Use createParentDirectories: true to create it.`,
      };
    }

    await fs.mkdir(currentPath);

    await assertRealPathInsideWorkspace(
      workspaceRoot,
      currentPath,
      relativePath,
      "created parent directory",
    );
  }

  return { ok: true };
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return text.split(/\r?\n/).length;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
