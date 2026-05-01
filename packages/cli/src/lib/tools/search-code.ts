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

export async function createSearchCodeTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    searchCode: tool({
      description:
        "Search workspace code using ripgrep and return matching file locations with line snippets.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Regex pattern to search for."),
        path: z
          .string()
          .optional()
          .describe("Optional workspace-relative file or directory to search."),
        glob: z
          .string()
          .optional()
          .describe("Optional ripgrep glob filter, e.g. '*.ts' or 'src/**/*.tsx'."),
        fixedStrings: z
          .boolean()
          .optional()
          .describe("Treat the query as literal text instead of a regex."),
        caseSensitive: z
          .boolean()
          .optional()
          .describe("Use case-sensitive matching. Defaults to smart-case."),
        maxMatches: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Maximum number of matches to return. Defaults to 100."),
        noIgnore: z
          .boolean()
          .optional()
          .describe("Search files ignored by .gitignore and other ignore files."),
      }),
      execute: async ({
        query,
        path: searchPath,
        glob,
        fixedStrings,
        caseSensitive,
        maxMatches,
        noIgnore,
      }) => {
        const result = await searchCode({
          workspaceRoot: resolvedWorkspaceRoot,
          query,
          searchPath,
          glob,
          fixedStrings: fixedStrings ?? false,
          caseSensitive: caseSensitive ?? false,
          maxMatches: maxMatches ?? 100,
          noIgnore: noIgnore ?? false,
        });

        if (result.code === 1 && !result.output) {
          return "No matches found.";
        }

        if (result.code !== 0 && result.code !== 1) {
          return `Search failed with exit code ${result.code}.\n\nOutput:\n${result.output || "(no output)"}`;
        }

        return result.truncated
          ? `${result.output}\n\n[Output truncated for length]`
          : result.output;
      },
    }),
  };
}

type SearchCodeOptions = {
  workspaceRoot: string;
  query: string;
  searchPath?: string;
  glob?: string;
  fixedStrings: boolean;
  caseSensitive: boolean;
  maxMatches: number;
  noIgnore: boolean;
};

async function searchCode({
  workspaceRoot,
  query,
  searchPath,
  glob,
  fixedStrings,
  caseSensitive,
  maxMatches,
  noIgnore,
}: SearchCodeOptions): Promise<ExecuteProcessResult> {
  assertSafeWorkspaceRoot(workspaceRoot, "search");

  const targetPath = resolveSearchPath(workspaceRoot, searchPath);
  const args = [
    "--line-number",
    "--column",
    "--color",
    "never",
    "--max-count",
    String(maxMatches),
  ];

  if (fixedStrings) args.push("--fixed-strings");
  if (caseSensitive) args.push("--case-sensitive");
  else args.push("--smart-case");
  if (noIgnore) args.push("--no-ignore");
  if (glob) args.push("--glob", glob);

  args.push(query, targetPath);

  return await executeProcess({
    command: rgPath,
    args,
    cwd: workspaceRoot,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    timeoutMessage: `Search timed out after ${DEFAULT_TIMEOUT_MS}ms`,
  });
}

function resolveSearchPath(workspaceRoot: string, searchPath?: string) {
  if (!searchPath) return workspaceRoot;

  return resolveWorkspacePath(workspaceRoot, searchPath).absolutePath;
}
