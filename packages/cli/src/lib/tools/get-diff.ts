import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import { executeProcess, type ExecuteProcessResult } from "../process";
import {
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_LENGTH,
} from "../utils";
import { assertSafeWorkspaceRoot, resolveWorkspacePath } from "../workspace";

export async function createGetDiffTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    getDiff: tool({
      description:
        "Return the current tracked git diff for the workspace or an optional file path. If no tracked diff exists, returns git status to show untracked files.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe("Optional workspace-relative file or directory path."),
        staged: z
          .boolean()
          .optional()
          .describe("Show staged diff using git diff --cached. Defaults to false."),
      }),
      execute: async ({ path: diffPath, staged }) => {
        const result = await getDiff({
          workspaceRoot: resolvedWorkspaceRoot,
          diffPath,
          staged: staged ?? false,
        });

        if (result.code !== 0) {
          return `Diff failed with ${formatExitReason(result)}.

Output:
${formatOutput(result)}`;
        }

        if (result.output) {
          return formatOutput(result);
        }

        const status = await getGitStatus({
          workspaceRoot: resolvedWorkspaceRoot,
          statusPath: diffPath,
        });

        if (status.code !== 0) {
          return `No tracked diff.

Git status failed with ${formatExitReason(status)}.

Output:
${formatOutput(status)}`;
        }

        if (status.output) {
          return `No tracked diff.

Git status:
${formatOutput(status)}`;
        }

        return "No diff.";
      },
    }),
  };
}

export type GetDiffOptions = {
  workspaceRoot: string;
  diffPath?: string;
  staged: boolean;
};

export async function getDiff({
  workspaceRoot,
  diffPath,
  staged,
}: GetDiffOptions): Promise<ExecuteProcessResult> {
  assertSafeWorkspaceRoot(workspaceRoot, "get diff");

  const args = ["diff", "--no-ext-diff", "--no-color"];

  if (staged) {
    args.push("--cached");
  }

  args.push("--");

  if (diffPath) {
    const { relativePath } = resolveWorkspacePath(workspaceRoot, diffPath);
    args.push(relativePath);
  }

  return await executeProcess({
    command: "git",
    args,
    cwd: workspaceRoot,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    timeoutMessage: `Diff timed out after ${DEFAULT_TIMEOUT_MS}ms`,
  });
}

type GetGitStatusOptions = {
  workspaceRoot: string;
  statusPath?: string;
};

async function getGitStatus({
  workspaceRoot,
  statusPath,
}: GetGitStatusOptions): Promise<ExecuteProcessResult> {
  assertSafeWorkspaceRoot(workspaceRoot, "get status");

  const args = ["status", "--short", "--untracked-files=all", "--"];

  if (statusPath) {
    const { relativePath } = resolveWorkspacePath(workspaceRoot, statusPath);
    args.push(relativePath);
  }

  return await executeProcess({
    command: "git",
    args,
    cwd: workspaceRoot,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    timeoutMessage: `Status timed out after ${DEFAULT_TIMEOUT_MS}ms`,
  });
}

function formatExitReason(result: ExecuteProcessResult): string {
  if (result.signal) {
    return `signal ${result.signal}`;
  }

  return `exit code ${result.code}`;
}

function formatOutput(result: ExecuteProcessResult): string {
  const output = result.output || "(no output)";

  return result.truncated
    ? `${output}\n[Output truncated for length]`
    : output;
}
