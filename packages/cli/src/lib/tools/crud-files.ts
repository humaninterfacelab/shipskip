import fs from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { applyPatch, parsePatch } from "diff";
import { z } from "zod";

import { getLogger } from "../logger";
import { resolveSafePath } from "../utils";

export function createCrudFileTools(workspace: string) {
  const resolvedWorkspace = path.resolve(workspace);

  return {
    readFiles: createReadFilesTool(resolvedWorkspace),
    writeFiles: createWriteFilesTool(resolvedWorkspace),
    moveFiles: createMoveFilesTool(resolvedWorkspace),
    deleteFiles: createDeleteFilesTool(resolvedWorkspace),
    applyPatch: createApplyPatchTool(resolvedWorkspace),
  };
}

export function createReadFilesTool(workspace: string) {
  return tool({
    description: "Read multiple UTF-8 text files",

    inputSchema: z.object({
      paths: z.array(z.string().min(1)).min(1),
    }),

    execute: async ({ paths }) => {
      const logger = getLogger();
      const startedAt = Date.now();

      logger.debug({ paths }, "readFiles started");

      const result = await Promise.all(
        paths.map(async (targetPath) => {
          const resolvedPath = resolveSafePath(workspace, targetPath);
          const content = await fs.readFile(resolvedPath, "utf8");

          return {
            path: targetPath,
            content,
          };
        }),
      );

      logger.debug(
        {
          paths,
          count: result.length,
          durationMs: Date.now() - startedAt,
          totalBytes: result.reduce(
            (sum, file) => sum + file.content.length,
            0,
          ),
        },
        "readFiles finished",
      );

      return result;
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
      const logger = getLogger();
      const startedAt = Date.now();
      const paths = files.map((file) => file.path);

      logger.debug(
        {
          paths,
          count: files.length,
          totalBytes: files.reduce((sum, file) => sum + file.content.length, 0),
        },
        "writeFiles started",
      );

      const result = await Promise.all(
        files.map(async ({ path: targetPath, content }) => {
          const resolvedPath = resolveSafePath(workspace, targetPath);

          await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
          await fs.writeFile(resolvedPath, content, "utf8");

          return {
            success: true,
            path: targetPath,
          };
        }),
      );

      logger.debug(
        { paths, count: result.length, durationMs: Date.now() - startedAt },
        "writeFiles finished",
      );

      return result;
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
      const logger = getLogger();
      const startedAt = Date.now();

      logger.debug({ moves, count: moves.length }, "moveFiles started");

      const result = await Promise.all(
        moves.map(async ({ from, to }) => {
          const sourcePath = resolveSafePath(workspace, from);
          const destinationPath = resolveSafePath(workspace, to);

          await fs.mkdir(path.dirname(destinationPath), { recursive: true });
          await fs.rename(sourcePath, destinationPath);

          return {
            success: true,
            from,
            to,
          };
        }),
      );

      logger.debug(
        { moves, count: result.length, durationMs: Date.now() - startedAt },
        "moveFiles finished",
      );

      return result;
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
      const logger = getLogger();
      const startedAt = Date.now();

      logger.debug(
        { paths, recursive, count: paths.length },
        "deleteFiles started",
      );

      const result = await Promise.all(
        paths.map(async (targetPath) => {
          const resolvedPath = resolveSafePath(workspace, targetPath);

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

      logger.debug(
        {
          paths,
          recursive,
          count: result.length,
          durationMs: Date.now() - startedAt,
        },
        "deleteFiles finished",
      );

      return result;
    },
  });
}

export function createApplyPatchTool(workspace: string) {
  return tool({
    description: "Apply a unified diff patch to one or more UTF-8 text files",

    inputSchema: z.object({
      patch: z.string().min(1),
      dryRun: z.boolean().default(false),
    }),

    execute: async ({ patch, dryRun }) => {
      const logger = getLogger();
      const startedAt = Date.now();
      const filePatches = parsePatch(patch);

      const writes: Array<{
        path: string;
        resolvedPath: string;
        content: string | null;
      }> = [];

      for (const filePatch of filePatches) {
        const targetPath =
          filePatch.newFileName === "/dev/null"
            ? filePatch.oldFileName
            : filePatch.newFileName;

        if (!targetPath) {
          throw new Error("Patch is missing a target path");
        }

        const normalizedPath = targetPath.replace(/^[ab]\//, "");
        const resolvedPath = resolveSafePath(workspace, normalizedPath);

        const isNewFile = filePatch.oldFileName === "/dev/null";
        const isDeletedFile = filePatch.newFileName === "/dev/null";

        const oldContent = isNewFile
          ? ""
          : await fs.readFile(resolvedPath, "utf8");

        const newContent = applyPatch(oldContent, filePatch);

        if (newContent === false) {
          throw new Error(`Patch failed to apply: ${normalizedPath}`);
        }

        writes.push({
          path: normalizedPath,
          resolvedPath,
          content: isDeletedFile ? null : newContent,
        });
      }

      const changed = writes.map((write) => write.path);

      logger.debug(
        { changed, count: changed.length, dryRun },
        "applyPatch started",
      );

      if (!dryRun) {
        for (const write of writes) {
          if (write.content === null) {
            await fs.rm(write.resolvedPath);
          } else {
            await fs.mkdir(path.dirname(write.resolvedPath), {
              recursive: true,
            });

            await fs.writeFile(write.resolvedPath, write.content, "utf8");
          }
        }
      }

      logger.debug(
        {
          changed,
          count: changed.length,
          dryRun,
          durationMs: Date.now() - startedAt,
        },
        "applyPatch finished",
      );

      return {
        success: true,
        dryRun,
        changed,
      };
    },
  });
}
