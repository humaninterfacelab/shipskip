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
  const sessionPath = path.resolve(
    process.env.SHIPSKIP_SESSION_PATH ?? path.join(os.tmpdir(), ".shipskip", id),
  );
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

export function formatSessionArtifacts(session: Session): string {
  return `\nSHIPSKIP_SESSION=${JSON.stringify({
    id: session.id,
    path: session.path,
    workspacePath: session.workspacePath,
    logPath: session.logPath,
  })}`;
}
