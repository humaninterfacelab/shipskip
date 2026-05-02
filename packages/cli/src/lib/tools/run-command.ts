import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import { executeProcess, type ExecuteProcessResult } from "../process";
import { assertSafeWorkspaceRoot } from "../workspace";

const ALLOWED_COMMANDS = ["npm", "yarn", "pnpm", "bun"] as const;
type AllowedCommand = (typeof ALLOWED_COMMANDS)[number];

const MAX_OUTPUT_LENGTH = 1_000_000; // 1MB
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Tokens that imply shell parsing/control flow.
 *
 * This tool intentionally does not run through a shell. It executes package managers
 * directly with parsed argv, so shell syntax would otherwise be passed through
 * as literal arguments and produce confusing package/framework errors.
 */
const UNSUPPORTED_SHELL_SYNTAX = [
  "&&",
  "||",
  "|",
  "2>",
  "1>",
  ">",
  "<",
  "&",
  ";",
  "`",
  "$(",
  "${",
] as const;

export async function createRunCommandTool(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    runCommand: tool({
      description: `Execute a finite package-manager command in the workspace.

Only npm, yarn, pnpm, and bun are allowed.

This is not a shell. Do not use shell syntax such as:
- pipes: npm run build | head
- redirects: npm run build 2>&1
- command chaining: npm run lint && npm run build
- directory changes: cd app && npm run build
- background jobs: npm run dev &
- command substitution: echo $(pwd)
- environment-variable assignment: CI=1 npm test

Valid examples:
- npm run build
- npm run lint
- npm test
- npm install
- yarn build
- pnpm test
- bun test

Avoid long-running commands such as npm run dev unless you expect them to be
terminated by the timeout.`,
      inputSchema: z.object({
        script: z
          .string()
          .min(1)
          .describe(
            "Plain package-manager command to run, e.g. 'npm run build'. Shell syntax is not supported.",
          ),
      }),
      execute: async ({ script }) => {
        const result = await executeScript(script, resolvedWorkspaceRoot);

        if (result.code !== 0 || result.signal) {
          const reason = result.signal
            ? `killed by signal ${result.signal}`
            : `exit code ${result.code}`;

          return `Command failed with ${reason}.

Output:
${formatOutput(result)}`;
        }

        return formatOutput(result);
      },
    }),
  };
}

async function executeScript(
  script: string,
  workspaceRoot: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ExecuteProcessResult> {
  assertSafeWorkspaceRoot(workspaceRoot, "execute commands");

  const normalizedScript = normalizeScript(script);

  assertNoShellSyntax(normalizedScript);

  const { cmd, args } = parseCommand(normalizedScript);

  if (!isAllowedCommand(cmd)) {
    throw new Error(
      `Command not allowed: ${cmd}. Only ${ALLOWED_COMMANDS.join(", ")} are permitted.`,
    );
  }

  return await executeProcess({
    command: cmd,
    args,
    cwd: workspaceRoot,
    timeoutMs,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    timeoutMessage: `Command timed out after ${timeoutMs}ms: ${normalizedScript}

This tool is intended for finite commands such as build, lint, test, and install.
Long-running commands such as dev servers should use a dedicated server/preview tool.`,
  });
}

function normalizeScript(script: string): string {
  return script.trim();
}

function assertNoShellSyntax(script: string) {
  const found = UNSUPPORTED_SHELL_SYNTAX.find((token) =>
    script.includes(token),
  );

  if (found) {
    throw new Error(
      `Shell syntax is not supported by runCommand. Found "${found}".

Use a plain package-manager command only, for example:
- npm run build
- npm run lint
- npm test
- npm install

Do not use pipes, redirects, cd, &&, ;, background jobs, command substitution, or environment-variable assignment.`,
    );
  }

  assertNoEnvAssignment(script);
}

/**
 * Reject commands like:
 * - CI=1 npm test
 * - NODE_ENV=production npm run build
 *
 * Because this tool does not use a shell, those would be parsed as the command
 * name rather than as environment variables.
 */
function assertNoEnvAssignment(script: string) {
  const firstToken = /^\S+/.exec(script)?.[0];

  if (!firstToken) {
    throw new Error("Script cannot be empty");
  }

  if (/^[A-Za-z_]\w*=/.test(firstToken)) {
    throw new Error(
      `Environment-variable assignment is not supported by runCommand. Found "${firstToken}".

Use a plain package-manager command only, for example:
- npm test
- npm run build

If environment variables are needed, add explicit support for them in the tool schema instead of using shell syntax.`,
    );
  }
}

/**
 * Splits a command string into argv-like parts while supporting simple quoted
 * arguments.
 *
 * Examples:
 * - npm run build
 *   => ["npm", "run", "build"]
 *
 * - npm run test -- --grep "landing page"
 *   => ["npm", "run", "test", "--", "--grep", "landing page"]
 *
 * This is intentionally not a shell parser.
 */
function parseCommand(script: string): { cmd: string; args: string[] } {
  const matches = script.matchAll(/[^\s"']+|"([^"]*)"|'([^']*)'/g);
  const parts = Array.from(matches).map((m) => m[1] ?? m[2] ?? m[0]);

  const [cmd, ...args] = parts;

  if (!cmd) {
    throw new Error("Script cannot be empty");
  }

  return { cmd, args };
}

function isAllowedCommand(cmd: string): cmd is AllowedCommand {
  return ALLOWED_COMMANDS.includes(cmd as AllowedCommand);
}

function formatOutput(result: ExecuteProcessResult): string {
  const output = result.output || "(no output)";

  return result.truncated
    ? `${output}\n[Output truncated for length]`
    : output;
}
