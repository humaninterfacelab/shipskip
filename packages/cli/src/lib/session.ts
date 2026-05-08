import fs from "fs";
import os from "os";
import path from "path";

let _sessionDir: string | null = null;

export function createSession() {
  if (_sessionDir) return;

  if (process.env.SHIPSKIP_SESSION_DIR) {
    _sessionDir = process.env.SHIPSKIP_SESSION_DIR;
  } else {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    _sessionDir = path.join(os.tmpdir(), "shipskip", timestamp);
  }
  if (!fs.existsSync(_sessionDir)) {
    fs.mkdirSync(_sessionDir, { recursive: true });
  }
}

export function getSessionDir() {
  if (!_sessionDir) createSession();
  return _sessionDir!;
}
