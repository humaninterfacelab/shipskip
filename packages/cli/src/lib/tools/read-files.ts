import fs from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import {
  addLineNumbers,
  looksBinary,
  MAX_OUTPUT_LENGTH,
  MAX_READ_FILE_BYTES,
  truncateText,
} from "../utils";
import {
  assertSafeWorkspaceRoot,
  resolveExistingWorkspaceFile,
} from "../workspace";

export async function createReadFileTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    readFile: tool({
      description:
        "Read a workspace file. Supports optional line ranges and optional line numbers.",
      inputSchema: z.object({
        path: z
          .string()
          .min(1)
          .describe("Workspace-relative file path to read."),
        startLine: z.number().int().min(1).optional(),
        endLine: z.number().int().min(1).optional(),
        lineNumbers: z
          .boolean()
          .optional()
          .describe(
            "Whether to prefix lines with line numbers. Defaults to false.",
          ),
      }),
      execute: async ({ path: filePath, startLine, endLine, lineNumbers }) => {
        return await readWorkspaceFile({
          workspaceRoot: resolvedWorkspaceRoot,
          filePath,
          startLine,
          endLine,
          lineNumbers: lineNumbers ?? false,
        });
      },
    }),
  };
}

type ReadWorkspaceFileOptions = {
  workspaceRoot: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  lineNumbers: boolean;
};

async function readWorkspaceFile({
  workspaceRoot,
  filePath,
  startLine,
  endLine,
  lineNumbers,
}: ReadWorkspaceFileOptions): Promise<string> {
  assertSafeWorkspaceRoot(workspaceRoot, "read file");

  if (startLine && endLine && endLine < startLine) {
    return `Invalid line range: endLine (${endLine}) is before startLine (${startLine}).`;
  }

  const { absolutePath } = await resolveExistingWorkspaceFile(
    workspaceRoot,
    filePath,
  );

  const stats = await fs.stat(absolutePath);

  if (!stats.isFile()) {
    return `Path is not a file: ${filePath}`;
  }

  if (stats.size > MAX_READ_FILE_BYTES) {
    return `File is too large to read: ${filePath} (${stats.size} bytes).`;
  }

  const buffer = await fs.readFile(absolutePath);

  if (looksBinary(buffer)) {
    return `File appears to be binary and was not read: ${filePath}`;
  }

  const content = buffer.toString("utf8");

  let output = content;
  let firstLineNumber = 1;

  if (startLine || endLine) {
    const lines = content.split(/\r?\n/);
    const start = startLine ?? 1;
    const end = endLine ?? lines.length;

    if (start > lines.length) {
      return `Line range starts after end of file. File has ${lines.length} lines.`;
    }

    output = lines.slice(start - 1, end).join("\n");
    firstLineNumber = start;
  }

  if (lineNumbers) {
    output = addLineNumbers(output, firstLineNumber);
  }

  return truncateText(output, MAX_OUTPUT_LENGTH);
}
