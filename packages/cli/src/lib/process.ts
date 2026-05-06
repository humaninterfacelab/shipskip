import { spawn } from "node:child_process";

export type ExecuteProcessResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  truncated: boolean;
};

type ExecuteProcessOptions = {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputLength: number;
  timeoutMessage: string;
  onStdout?: (chunk: Buffer) => void;
  onStderr?: (chunk: Buffer) => void;
};

export async function executeProcess({
  command,
  args,
  cwd,
  env,
  timeoutMs,
  maxOutputLength,
  timeoutMessage,
  onStdout,
  onStderr,
}: ExecuteProcessOptions): Promise<ExecuteProcessResult> {
  return await new Promise<ExecuteProcessResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      detached: true,
      env,
      shell: false,
    });

    let output = "";
    let truncated = false;
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        killProcessGroup(child.pid);
      }
    };

    const cleanupAndExit = (signal: NodeJS.Signals) => {
      cleanup();
      process.kill(process.pid, signal);
    };

    process.once("exit", cleanup);
    process.once("SIGINT", cleanupAndExit);
    process.once("SIGTERM", cleanupAndExit);

    const removeCleanupHandlers = () => {
      process.off("exit", cleanup);
      process.off("SIGINT", cleanupAndExit);
      process.off("SIGTERM", cleanupAndExit);
    };

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      removeCleanupHandlers();
      killProcessGroup(child.pid);
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    const appendOutput = (chunk: Buffer) => {
      if (truncated) return;
      const text = chunk.toString();

      if (output.length + text.length > maxOutputLength) {
        output += text.slice(0, maxOutputLength - output.length);
        truncated = true;
      } else {
        output += text;
      }
    };

    child.stdout.on("data", (data) => {
      onStdout?.(data);
      appendOutput(data);
    });

    child.stderr.on("data", (data) => {
      onStderr?.(data);
      appendOutput(data);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      removeCleanupHandlers();
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      removeCleanupHandlers();
      resolve({ code, signal, output, truncated });
    });
  });
}

function killProcessGroup(pid: number | undefined) {
  if (!pid) {
    return;
  }

  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The process may have exited between timeout handling and kill.
    }
  }
}
