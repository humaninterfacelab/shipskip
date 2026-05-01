import fs from "node:fs/promises";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import {
  countOccurrences,
  looksBinary,
  MAX_READ_FILE_BYTES,
  replaceFirst,
} from "../utils";
import {
  assertSafeWorkspaceRoot,
  resolveExistingWorkspaceFile,
} from "../workspace";
import { getDiff } from "./get-diff";

export async function createApplyPatchTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    applyPatch: tool({
      description:
        "Patch a workspace file by replacing an exact oldText occurrence with newText.",
      inputSchema: z.object({
        path: z.string().min(1).describe("Workspace-relative file path to patch."),
        oldText: z
          .string()
          .min(1)
          .describe("Exact text to replace. Must appear in the file."),
        newText: z.string().describe("Replacement text."),
        replaceAll: z
          .boolean()
          .optional()
          .describe(
            "Replace all occurrences. Defaults to false. If false, oldText must appear exactly once.",
          ),
      }),
      execute: async ({ path: filePath, oldText, newText, replaceAll }) => {
        return await applyPatch({
          workspaceRoot: resolvedWorkspaceRoot,
          filePath,
          oldText,
          newText,
          replaceAll: replaceAll ?? false,
        });
      },
    }),
  };
}

type ApplyPatchOptions = {
  workspaceRoot: string;
  filePath: string;
  oldText: string;
  newText: string;
  replaceAll: boolean;
};

async function applyPatch({
  workspaceRoot,
  filePath,
  oldText,
  newText,
  replaceAll,
}: ApplyPatchOptions): Promise<string> {
  assertSafeWorkspaceRoot(workspaceRoot, "apply patch");

  const { absolutePath, relativePath } = await resolveExistingWorkspaceFile(
    workspaceRoot,
    filePath,
  );

  const stats = await fs.stat(absolutePath);

  if (!stats.isFile()) {
    return `Path is not a file: ${filePath}`;
  }

  if (stats.size > MAX_READ_FILE_BYTES) {
    return `File is too large to patch safely: ${filePath} (${stats.size} bytes).`;
  }

  const buffer = await fs.readFile(absolutePath);

  if (looksBinary(buffer)) {
    return `File appears to be binary and was not patched: ${filePath}`;
  }

  const content = buffer.toString("utf8");
  const occurrences = countOccurrences(content, oldText);

  if (occurrences === 0) {
    return `Patch failed: oldText was not found in ${filePath}.`;
  }

  if (!replaceAll && occurrences > 1) {
    return `Patch failed: oldText appears ${occurrences} times in ${filePath}. Use replaceAll: true or provide a more specific oldText.`;
  }

  const updated = replaceAll
    ? content.split(oldText).join(newText)
    : replaceFirst(content, oldText, newText);

  if (updated === content) {
    return `No changes made to ${filePath}.`;
  }

  await fs.writeFile(absolutePath, updated, "utf8");

  const diff = await getDiff({
    workspaceRoot,
    diffPath: relativePath,
    staged: false,
  });

  if (diff.code === 0 && diff.output) {
    return `Patch applied to ${filePath}.\n\n${diff.output}`;
  }

  return `Patch applied to ${filePath}.`;
}
