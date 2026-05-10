import path from "node:path";

import { tool } from "ai";
import { globby } from "globby";
import { z } from "zod";

export function createGlobTool(workspace: string) {
  const resolvedWorkspace = path.resolve(workspace);

  return {
    glob: tool({
      description:
        "Find files and directories in the workspace using glob patterns. Returns relative paths only.",

      inputSchema: z.object({
        patterns: z.array(z.string().min(1)).min(1).describe("Glob patterns"),

        gitIgnore: z
          .boolean()
          .default(true)
          .describe("Respect .gitignore files"),

        includeDot: z
          .boolean()
          .default(false)
          .describe("Include entries that start with a dot"),

        depth: z
          .number()
          .int()
          .min(0)
          .max(10)
          .default(2)
          .describe("Maximum directory depth"),

        onlyFiles: z.boolean().default(false).describe("Return only files"),

        onlyDirectories: z
          .boolean()
          .default(false)
          .describe("Return only directories"),
      }),

      execute: async ({
        patterns,
        gitIgnore,
        includeDot,
        depth,
        onlyFiles,
        onlyDirectories,
      }) => {
        const paths = await globby(patterns, {
          cwd: resolvedWorkspace,
          gitignore: gitIgnore,
          dot: includeDot,
          deep: depth,
          followSymbolicLinks: false,
          absolute: false,
          onlyFiles,
          onlyDirectories,
        });

        return {
          paths,
          count: paths.length,
        };
      },
    }),
  };
}
