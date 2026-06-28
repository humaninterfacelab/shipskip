import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function createSessionDirectories() {
  const sessionRootDir = fs.mkdtempSync(path.join(os.tmpdir(), "shipskip-"));

  return {
    sessionRootDir,
    workspaceDir: path.join(sessionRootDir, "workspace"),
  };
}

