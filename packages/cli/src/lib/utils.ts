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
