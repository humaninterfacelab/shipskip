import path from "node:path";

import { rgPath } from "@vscode/ripgrep";
import { tool } from "ai";
import { execa } from "execa";
import { z } from "zod";

import { getLogger } from "../logger";
import { truncate } from "../utils";

export function createRipgrepTool(workspace: string) {
  const resolvedWorkspace = path.resolve(workspace);

  return {
    ripgrep: tool({
      description: "Search file contents using ripgrep regular expressions",

      inputSchema: z.object({
        pattern: z.string().min(1).describe("Regex pattern to search for"),

        glob: z
          .array(z.string())
          .default(["**/*"])
          .describe("Glob patterns for files to search"),

        caseSensitive: z
          .boolean()
          .default(false)
          .describe("Whether search is case-sensitive"),

        includeDot: z
          .boolean()
          .default(false)
          .describe("Whether to include dot files"),

        maxResults: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(100)
          .describe("Maximum number of matches to return"),
      }),

      execute: async ({
        pattern,
        glob,
        caseSensitive,
        includeDot,
        maxResults,
      }) => {
        const args: string[] = [
          "--json",
          "--line-number",
          "--column",
          "--max-count",
          String(maxResults),
        ];

        if (!caseSensitive) {
          args.push("-i");
        }

        if (includeDot) {
          args.push("--hidden");
        }

        for (const g of glob) {
          args.push("-g", g);
        }

        args.push(pattern);
        args.push(".");

        const logger = getLogger();
        const startedAt = Date.now();

        logger.debug(
          { pattern, glob, caseSensitive, includeDot, maxResults },
          "ripgrep started",
        );

        const result = await execa(rgPath, args, {
          cwd: resolvedWorkspace,
          maxBuffer: 1_000_000,
          reject: false,
          timeout: 30_000,
        });

        logger.debug(
          {
            pattern,
            glob,
            exitCode: result.exitCode,
            failed: result.failed,
            timedOut: result.timedOut,
            durationMs: Date.now() - startedAt,
            stdoutLength: result.stdout.length,
            stderrLength: result.stderr.length,
          },
          "ripgrep finished",
        );

        logger.trace(
          { pattern, glob, stdout: result.stdout, stderr: result.stderr },
          "ripgrep output",
        );

        return {
          exitCode: result.exitCode,
          stdout: truncate(result.stdout),
          stderr: truncate(result.stderr),
          failed: result.failed,
          timedOut: result.timedOut,
        };
      },
    }),
  };
}
