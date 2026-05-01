import path from "node:path";

import { tool } from "ai";
import { rgPath } from "vscode-ripgrep";
import { z } from "zod";

import { executeProcess, type ExecuteProcessResult } from "../process";
import {
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_LENGTH,
} from "../utils";
import { assertSafeWorkspaceRoot, resolveWorkspacePath } from "../workspace";

export async function createFindFilesTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    findFiles: tool({
      description:
        "Find workspace files by path/name using ripgrep --files. Supports optional glob filtering.",
      inputSchema: z.object({
        glob: z
          .string()
          .optional()
          .describe(
            "Optional ripgrep glob filter, e.g. '*.ts', 'src/**/*.tsx', or '!node_modules/**'.",
          ),
        path: z
          .string()
          .optional()
          .describe(
            "Optional workspace-relative directory to list files from.",
          ),
        noIgnore: z
          .boolean()
          .optional()
          .describe(
            "Include files ignored by .gitignore and other ignore files. Does not include hidden files unless includeHidden is also true.",
          ),
        includeHidden: z
          .boolean()
          .optional()
          .describe(
            "Include hidden files and directories such as .env, .github, and .eslintrc.",
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Maximum number of file paths to return. Defaults to 100."),
      }),
      execute: async ({
        glob,
        path: searchPath,
        noIgnore,
        includeHidden,
        maxResults,
      }) => {
        const result = await findFiles({
          workspaceRoot: resolvedWorkspaceRoot,
          searchPath,
          glob,
          noIgnore: noIgnore ?? false,
          includeHidden: includeHidden ?? false,
          maxResults: maxResults ?? 100,
        });

        if (result.code === 1 && !result.output) {
          return "No files found.";
        }

        if (result.code !== 0 && result.code !== 1) {
          return `Find files failed with ${formatExitReason(result)}.

Output:
${formatOutput(result)}`;
        }

        return formatOutput(result);
      },
    }),
  };
}

type FindFilesOptions = {
  workspaceRoot: string;
  searchPath?: string;
  glob?: string;
  noIgnore: boolean;
  includeHidden: boolean;
  maxResults: number;
};

async function findFiles({
  workspaceRoot,
  searchPath,
  glob,
  noIgnore,
  includeHidden,
  maxResults,
}: FindFilesOptions): Promise<ExecuteProcessResult> {
  assertSafeWorkspaceRoot(workspaceRoot, "find files");

  const targetPath = resolveSearchPath(workspaceRoot, searchPath);

  const args = ["--files"];

  if (noIgnore) {
    args.push("--no-ignore");
  }

  if (includeHidden) {
    args.push("--hidden");
  }

  if (glob) {
    args.push("--glob", glob);
  }

  args.push(targetPath);

  const result = await executeProcess({
    command: rgPath,
    args,
    cwd: workspaceRoot,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    timeoutMessage: `Find files timed out after ${DEFAULT_TIMEOUT_MS}ms`,
  });

  if (!result.output) {
    return result;
  }

  const lines = result.output.split(/\r?\n/).filter(Boolean);
  const limited = lines.slice(0, maxResults);
  const truncatedByCount = lines.length > maxResults;

  let output = limited.join("\n");

  if (truncatedByCount) {
    output += `

[Output truncated to ${maxResults} results]`;
  }

  if (result.truncated) {
    output += `

[Output truncated for length]`;
  }

  return {
    ...result,
    output,
    truncated: false,
  };
}

function resolveSearchPath(workspaceRoot: string, searchPath?: string): string {
  if (!searchPath) {
    return workspaceRoot;
  }

  return resolveWorkspacePath(workspaceRoot, searchPath).absolutePath;
}

function formatExitReason(result: ExecuteProcessResult): string {
  if (result.signal) {
    return `signal ${result.signal}`;
  }

  return `exit code ${result.code}`;
}

function formatOutput(result: ExecuteProcessResult): string {
  return result.output || "(no output)";
}
