import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import {
  assertSafeWorkspaceRoot,
  formatRelativePath,
  resolveExistingWorkspaceDirectory,
} from "../workspace";

const DEFAULT_MAX_DEPTH = 1;
const MAX_ALLOWED_DEPTH = 5;
const DEFAULT_MAX_ENTRIES = 500;
const MAX_ALLOWED_ENTRIES = 2_000;

const DEFAULT_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
  ".cache",
]);

export async function createListDirectoryTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    listDirectory: tool({
      description:
        "List files and directories inside a workspace directory. Supports recursive depth and hidden files. By default, common large/generated directories such as node_modules, .git, .next, dist, build, and coverage are omitted.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe(
            "Workspace-relative directory path. Defaults to workspace root.",
          ),
        depth: z
          .number()
          .int()
          .min(0)
          .max(MAX_ALLOWED_DEPTH)
          .optional()
          .describe(
            "Recursive depth to list. Defaults to 1. Use 0 for direct children only. Depth 1 includes direct children and one nested level.",
          ),
        includeHidden: z
          .boolean()
          .optional()
          .describe("Include dotfiles and dot-directories. Defaults to false."),
        includeCommonIgnored: z
          .boolean()
          .optional()
          .describe(
            "Include common large/generated directories such as node_modules, .git, .next, dist, build, and coverage. Defaults to false.",
          ),
        maxEntries: z
          .number()
          .int()
          .min(1)
          .max(MAX_ALLOWED_ENTRIES)
          .optional()
          .describe("Maximum number of entries to return. Defaults to 500."),
      }),
      execute: async ({
        path: directoryPath,
        depth,
        includeHidden,
        includeCommonIgnored,
        maxEntries,
      }) => {
        return await listDirectory({
          workspaceRoot: resolvedWorkspaceRoot,
          directoryPath: directoryPath ?? ".",
          depth: depth ?? DEFAULT_MAX_DEPTH,
          includeHidden: includeHidden ?? false,
          includeCommonIgnored: includeCommonIgnored ?? false,
          maxEntries: maxEntries ?? DEFAULT_MAX_ENTRIES,
        });
      },
    }),
  };
}

type ListDirectoryOptions = {
  workspaceRoot: string;
  directoryPath: string;
  depth: number;
  includeHidden: boolean;
  includeCommonIgnored: boolean;
  maxEntries: number;
};

async function listDirectory({
  workspaceRoot,
  directoryPath,
  depth,
  includeHidden,
  includeCommonIgnored,
  maxEntries,
}: ListDirectoryOptions): Promise<string> {
  assertSafeWorkspaceRoot(workspaceRoot, "list directory");

  const resolvedDirectory = await resolveExistingWorkspaceDirectory(
    workspaceRoot,
    directoryPath,
  ).catch((error: unknown) => ({
    error: getErrorMessage(error),
  }));

  if ("error" in resolvedDirectory) {
    return resolvedDirectory.error;
  }

  const realWorkspaceRoot = await fs.realpath(workspaceRoot);

  const rootCheck = await assertRealDirectoryInsideWorkspace({
    realWorkspaceRoot,
    absoluteDirectoryPath: resolvedDirectory.absolutePath,
  }).catch((error: unknown) => ({
    error: getErrorMessage(error),
  }));

  if (rootCheck && "error" in rootCheck) {
    return rootCheck.error;
  }

  const entries: string[] = [];
  let truncated = false;

  await walkDirectory({
    realWorkspaceRoot,
    absoluteDirectoryPath: resolvedDirectory.absolutePath,
    relativeDirectoryPath:
      resolvedDirectory.relativePath === "."
        ? ""
        : resolvedDirectory.relativePath,
    remainingDepth: depth,
    includeHidden,
    includeCommonIgnored,
    maxEntries,
    entries,
    onTruncated: () => {
      truncated = true;
    },
  });

  if (entries.length === 0) {
    return `No entries found in ${formatRelativePath(
      resolvedDirectory.relativePath,
    )}.`;
  }

  const output = entries.join("\n");

  return truncated
    ? `${output}

[Output truncated to ${maxEntries} entries]`
    : output;
}

type WalkDirectoryOptions = {
  realWorkspaceRoot: string;
  absoluteDirectoryPath: string;
  relativeDirectoryPath: string;
  remainingDepth: number;
  includeHidden: boolean;
  includeCommonIgnored: boolean;
  maxEntries: number;
  entries: string[];
  onTruncated: () => void;
};

async function walkDirectory({
  realWorkspaceRoot,
  absoluteDirectoryPath,
  relativeDirectoryPath,
  remainingDepth,
  includeHidden,
  includeCommonIgnored,
  maxEntries,
  entries,
  onTruncated,
}: WalkDirectoryOptions): Promise<void> {
  if (entries.length >= maxEntries) {
    onTruncated();
    return;
  }

  try {
    await assertRealDirectoryInsideWorkspace({
      realWorkspaceRoot,
      absoluteDirectoryPath,
    });
  } catch (error) {
    entries.push(
      `${formatDirectoryPath(
        relativeDirectoryPath,
      )} [Skipped: ${getErrorMessage(error)}]`,
    );
    return;
  }

  let dirents: Dirent[];

  try {
    dirents = await fs.readdir(absoluteDirectoryPath, {
      withFileTypes: true,
    });
  } catch (error) {
    entries.push(
      `${formatDirectoryPath(
        relativeDirectoryPath,
      )} [Unable to read directory: ${getErrorMessage(error)}]`,
    );
    return;
  }

  dirents.sort(compareDirents);

  for (const dirent of dirents) {
    const shouldContinue = await walkDirectoryEntry({
      dirent,
      realWorkspaceRoot,
      absoluteDirectoryPath,
      relativeDirectoryPath,
      remainingDepth,
      includeHidden,
      includeCommonIgnored,
      maxEntries,
      entries,
      onTruncated,
    });

    if (!shouldContinue) {
      return;
    }
  }
}

async function walkDirectoryEntry({
  dirent,
  realWorkspaceRoot,
  absoluteDirectoryPath,
  relativeDirectoryPath,
  remainingDepth,
  includeHidden,
  includeCommonIgnored,
  maxEntries,
  entries,
  onTruncated,
}: WalkDirectoryOptions & { dirent: Dirent }): Promise<boolean> {
  if (entries.length >= maxEntries) {
    onTruncated();
    return false;
  }

  if (!includeHidden && dirent.name.startsWith(".")) {
    return true;
  }

  const absoluteEntryPath = path.join(absoluteDirectoryPath, dirent.name);
  const relativeEntryPath = path.join(relativeDirectoryPath, dirent.name);
  const formattedEntryPath = formatRelativePath(relativeEntryPath);

  if (dirent.isSymbolicLink()) {
    entries.push(`${formattedEntryPath}@`);
    return true;
  }

  if (!dirent.isDirectory()) {
    entries.push(formattedEntryPath);
    return true;
  }

  if (!includeCommonIgnored && DEFAULT_EXCLUDED_DIRECTORIES.has(dirent.name)) {
    entries.push(`${formattedEntryPath}/ [omitted]`);
    return true;
  }

  const directoryStillSafe = await isSafeRealDirectory({
    realWorkspaceRoot,
    absoluteDirectoryPath: absoluteEntryPath,
  });

  if (!directoryStillSafe.ok) {
    entries.push(`${formattedEntryPath}/ [Skipped: ${directoryStillSafe.error}]`);
    return true;
  }

  entries.push(`${formattedEntryPath}/`);

  if (remainingDepth > 0) {
    await walkDirectory({
      realWorkspaceRoot,
      absoluteDirectoryPath: absoluteEntryPath,
      relativeDirectoryPath: relativeEntryPath,
      remainingDepth: remainingDepth - 1,
      includeHidden,
      includeCommonIgnored,
      maxEntries,
      entries,
      onTruncated,
    });
  }

  return true;
}

function compareDirents(a: Dirent, b: Dirent): number {
  if (a.isDirectory() && !b.isDirectory()) {
    return -1;
  }

  if (!a.isDirectory() && b.isDirectory()) {
    return 1;
  }

  return a.name.localeCompare(b.name);
}

async function isSafeRealDirectory({
  realWorkspaceRoot,
  absoluteDirectoryPath,
}: {
  realWorkspaceRoot: string;
  absoluteDirectoryPath: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertRealDirectoryInsideWorkspace({
      realWorkspaceRoot,
      absoluteDirectoryPath,
    });

    const stats = await fs.lstat(absoluteDirectoryPath);

    if (stats.isSymbolicLink()) {
      return {
        ok: false,
        error: "refusing to traverse symlink",
      };
    }

    if (!stats.isDirectory()) {
      return {
        ok: false,
        error: "path is no longer a directory",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

async function assertRealDirectoryInsideWorkspace({
  realWorkspaceRoot,
  absoluteDirectoryPath,
}: {
  realWorkspaceRoot: string;
  absoluteDirectoryPath: string;
}): Promise<void> {
  const realDirectoryPath = await fs.realpath(absoluteDirectoryPath);
  const relativePath = path.relative(realWorkspaceRoot, realDirectoryPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      `Directory must be inside workspace: ${absoluteDirectoryPath}`,
    );
  }
}

function formatDirectoryPath(relativeDirectoryPath: string): string {
  if (!relativeDirectoryPath) {
    return "./";
  }

  return `${formatRelativePath(relativeDirectoryPath)}/`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
