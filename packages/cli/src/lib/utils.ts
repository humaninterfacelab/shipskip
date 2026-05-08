import path from "node:path";

export function resolveSafePath(workspace: string, targetPath: string) {
  const resolvedPath = path.resolve(workspace, targetPath);

  const relative = path.relative(workspace, resolvedPath);

  const escapesWorkspace =
    relative.startsWith("..") || path.isAbsolute(relative);

  if (escapesWorkspace) {
    throw new Error("Path escapes workspace");
  }

  return resolvedPath;
}

export function truncate(value: string, maxLength = 50_000) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength) + "\n\n[output truncated]";
}

export const formatDuration = (startedAt: number) => {
  const ms = Date.now() - startedAt;
  const seconds = Math.round(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
};

export const summarizeValue = (value: unknown, maxLength = 500) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return truncate(value, maxLength);
  }

  try {
    return truncate(JSON.stringify(value, null, 2), maxLength);
  } catch {
    return String(value);
  }
};
