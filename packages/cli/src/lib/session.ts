import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type Session = {
  id: string;
  path: string;
  workspacePath: string;
  logPath: string;
};

export async function createSession(): Promise<Session> {
  const id = process.env.SHIPSKIP_SESSION_ID ?? randomUUID();
  validateSessionId(id);

  const sessionPath = resolveSessionPath(id);
  const workspacePath = path.join(sessionPath, "workspace");

  await mkdir(sessionPath, { recursive: true });
  await rm(workspacePath, { force: true, recursive: true });

  return {
    id,
    path: sessionPath,
    workspacePath,
    logPath: path.join(sessionPath, "session.log"),
  };
}

function validateSessionId(id: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(id) || id.startsWith(".")) {
    throw new Error(
      "SHIPSKIP_SESSION_ID must be a safe path segment containing only letters, numbers, dots, underscores, or hyphens.",
    );
  }
}

function resolveSessionPath(id: string) {
  const configuredPath = process.env.SHIPSKIP_SESSION_PATH;
  const sessionPath = path.resolve(
    configuredPath ?? path.join(os.tmpdir(), ".shipskip", id),
  );

  if (sessionPath === path.parse(sessionPath).root) {
    throw new Error("Refusing to use filesystem root as SHIPSKIP_SESSION_PATH.");
  }

  if (configuredPath) {
    const tempRoot = path.resolve(os.tmpdir());
    const relativeToTemp = path.relative(tempRoot, sessionPath);

    if (relativeToTemp.startsWith("..") || path.isAbsolute(relativeToTemp)) {
      throw new Error("SHIPSKIP_SESSION_PATH must be inside the system temporary directory.");
    }
  }

  return sessionPath;
}

export function formatSessionArtifacts(session: Session): string {
  return `\nSHIPSKIP_SESSION=${JSON.stringify({
    id: session.id,
    path: session.path,
    workspacePath: session.workspacePath,
    logPath: session.logPath,
  })}`;
}
