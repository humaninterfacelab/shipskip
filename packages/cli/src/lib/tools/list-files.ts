import path from "node:path";

import { tool } from "ai";
import { globby, type GlobbyOptions } from "globby";
import { z } from "zod";

export function createListFileTool(workspace: string) {
  const resolvedWorkspace = path.resolve(workspace);

  return {
    listFiles: tool({
      description: "List files and directories using glob patterns",

      inputSchema: z
        .object({
          patterns: z.array(z.string()).min(1).describe("Glob pattern"),

          gitIgnore: z
            .boolean()
            .default(true)
            .describe(
              "Respect ignore patterns in .gitignore files that apply to the globbed files",
            ),

          onlyDirectories: z
            .boolean()
            .default(false)
            .describe("Return only directories"),

          onlyFiles: z.boolean().default(false).describe("Return only files"),

          includeDot: z
            .boolean()
            .default(false)
            .describe(
              "Allow patterns to match entries that begin with a period (.)",
            ),

          depth: z
            .number()
            .int()
            .min(0)
            .max(10)
            .default(2)
            .describe(
              "Specifies the maximum depth of a read directory relative to the start directory",
            ),
        })
        .refine((value) => !(value.onlyDirectories && value.onlyFiles), {
          message: "onlyDirectories and onlyFiles cannot both be true",
          path: ["onlyFiles"],
        }),

      execute: async ({
        patterns,
        gitIgnore,
        onlyDirectories,
        onlyFiles,
        includeDot,
        depth,
      }) => {
        const options: GlobbyOptions = {
          cwd: resolvedWorkspace,
          gitignore: gitIgnore,
          onlyDirectories,
          onlyFiles,
          dot: includeDot,
          deep: depth,
          followSymbolicLinks: false,
          absolute: false,
        };

        return executeTool(patterns, options);
      },
    }),
  };
}

async function executeTool(patterns: string[], options: GlobbyOptions) {
  try {
    const files = await globby(patterns, options);

    return {
      files,
      count: files.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    throw new Error(`listFiles failed: ${message}`, {
      cause: error,
    });
  }
}
