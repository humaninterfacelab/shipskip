import fs from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

export function createCrudFileTools(workspace: string) {
  const resolvedWorkspace = path.resolve(workspace);

  return {
    readFiles: createReadFilesTool(resolvedWorkspace),
    writeFiles: createWriteFilesTool(resolvedWorkspace),
    moveFiles: createMoveFilesTool(resolvedWorkspace),
    deleteFiles: createDeleteFilesTool(resolvedWorkspace),
  };
}

export function createReadFilesTool(workspace: string) {
  return tool({
    description: "Read multiple UTF-8 text files",

    inputSchema: z.object({
      paths: z.array(z.string().min(1)).min(1),
    }),

    execute: async ({ paths }) => {
      return Promise.all(
        paths.map(async (targetPath) => {
          const resolvedPath = await resolveExistingSafePath(
            workspace,
            targetPath,
          );
          const content = await fs.readFile(resolvedPath, "utf8");

          return {
            path: targetPath,
            content,
          };
        }),
      );
    },
  });
}

export function createWriteFilesTool(workspace: string) {
  return tool({
    description: "Create or overwrite multiple UTF-8 text files",

    inputSchema: z.object({
      files: z
        .array(
          z.object({
            path: z.string().min(1),
            content: z.string(),
          }),
        )
        .min(1),
    }),

    execute: async ({ files }) => {
      return Promise.all(
        files.map(async ({ path: targetPath, content }) => {
          const resolvedPath = await resolveWritableSafePath(
            workspace,
            targetPath,
          );

          await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
          await fs.writeFile(resolvedPath, content, "utf8");

          return {
            success: true,
            path: targetPath,
          };
        }),
      );
    },
  });
}

export function createMoveFilesTool(workspace: string) {
  return tool({
    description: "Move or rename multiple files or directories",

    inputSchema: z.object({
      moves: z
        .array(
          z.object({
            from: z.string().min(1),
            to: z.string().min(1),
          }),
        )
        .min(1),
    }),

    execute: async ({ moves }) => {
      return Promise.all(
        moves.map(async ({ from, to }) => {
          const sourcePath = await resolveExistingSafePath(workspace, from);
          const destinationPath = await resolveWritableSafePath(workspace, to);

          try {
            await fs.lstat(destinationPath);
            throw new Error(`Destination already exists: ${to}`);
          } catch (error) {
            if (!isNodeError(error) || error.code !== "ENOENT") {
              throw error;
            }
          }

          await fs.mkdir(path.dirname(destinationPath), { recursive: true });
          await fs.rename(sourcePath, destinationPath);

          return {
            success: true,
            from,
            to,
          };
        }),
      );
    },
  });
}

export function createDeleteFilesTool(workspace: string) {
  return tool({
    description: "Delete multiple files or directories",

    inputSchema: z.object({
      paths: z.array(z.string().min(1)).min(1),
      recursive: z.boolean().default(false),
    }),

    execute: async ({ paths, recursive }) => {
      return Promise.all(
        paths.map(async (targetPath) => {
          const resolvedPath = await resolveExistingSafePath(
            workspace,
            targetPath,
          );

          await assertSafeDeletePath(workspace, resolvedPath, targetPath, recursive);

          await fs.rm(resolvedPath, {
            recursive,
            force: false,
          });

          return {
            success: true,
            deleted: targetPath,
          };
        }),
      );
    },
  });
}

async function assertSafeDeletePath(
  workspace: string,
  resolvedPath: string,
  targetPath: string,
  recursive: boolean,
) {
  const realWorkspace = await fs.realpath(workspace);
  const relativePath = path.relative(realWorkspace, resolvedPath);

  if (relativePath === "") {
    throw new Error(`Refusing to delete workspace root: ${targetPath}`);
  }

  if (recursive && !relativePath.includes(path.sep)) {
    throw new Error(`Refusing to recursively delete top-level path: ${targetPath}`);
  }
}

function resolveSafePath(workspace: string, targetPath: string) {
  const resolvedPath = path.resolve(workspace, targetPath);
  const relative = path.relative(workspace, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes workspace");
  }

  return resolvedPath;
}

async function resolveExistingSafePath(workspace: string, targetPath: string) {
  const resolvedPath = resolveSafePath(workspace, targetPath);

  return await assertRealPathInsideWorkspace(workspace, resolvedPath, targetPath);
}

async function resolveWritableSafePath(workspace: string, targetPath: string) {
  const resolvedPath = resolveSafePath(workspace, targetPath);

  try {
    await fs.lstat(resolvedPath);

    return await assertRealPathInsideWorkspace(
      workspace,
      resolvedPath,
      targetPath,
    );
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  await assertExistingParentInsideWorkspace(workspace, resolvedPath, targetPath);

  return resolvedPath;
}

async function assertExistingParentInsideWorkspace(
  workspace: string,
  absolutePath: string,
  targetPath: string,
) {
  let directory = path.dirname(absolutePath);

  while (true) {
    try {
      await assertRealPathInsideWorkspace(workspace, directory, targetPath);
      return;
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") {
        throw error;
      }
    }

    const parent = path.dirname(directory);

    if (parent === directory) {
      throw new Error("Path escapes workspace");
    }

    directory = parent;
  }
}

async function assertRealPathInsideWorkspace(
  workspace: string,
  absolutePath: string,
  targetPath: string,
) {
  const realWorkspace = await fs.realpath(workspace);
  const realPath = await fs.realpath(absolutePath);
  const relative = path.relative(realWorkspace, realPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes workspace: ${targetPath}`);
  }

  return realPath;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
