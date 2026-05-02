import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";

import { createSession, formatSessionArtifacts } from "./session";

const originalSessionId = process.env.SHIPSKIP_SESSION_ID;
const originalSessionPath = process.env.SHIPSKIP_SESSION_PATH;

afterEach(() => {
  restoreEnv("SHIPSKIP_SESSION_ID", originalSessionId);
  restoreEnv("SHIPSKIP_SESSION_PATH", originalSessionPath);
});

describe("createSession", () => {
  test("creates a temp session using the configured session id", async () => {
    process.env.SHIPSKIP_SESSION_ID = "test-session";
    delete process.env.SHIPSKIP_SESSION_PATH;

    const session = await createSession();

    expect(session).toEqual({
      id: "test-session",
      path: path.join(os.tmpdir(), ".shipskip", "test-session"),
      workspacePath: path.join(
        os.tmpdir(),
        ".shipskip",
        "test-session",
        "workspace",
      ),
      logPath: path.join(
        os.tmpdir(),
        ".shipskip",
        "test-session",
        "session.log",
      ),
    });
    await expect(directoryExists(session.path)).resolves.toBe(true);
  });

  test("uses an explicit session path", async () => {
    const sessionPath = await fs.mkdtemp(path.join(os.tmpdir(), "shipskip-test-"));
    process.env.SHIPSKIP_SESSION_ID = "ci-session";
    process.env.SHIPSKIP_SESSION_PATH = sessionPath;

    const session = await createSession();

    expect(session).toEqual({
      id: "ci-session",
      path: sessionPath,
      workspacePath: path.join(sessionPath, "workspace"),
      logPath: path.join(sessionPath, "session.log"),
    });
  });

  test("resets the workspace without removing session artifacts", async () => {
    const sessionPath = await fs.mkdtemp(path.join(os.tmpdir(), "shipskip-test-"));
    process.env.SHIPSKIP_SESSION_ID = "reset-session";
    process.env.SHIPSKIP_SESSION_PATH = sessionPath;

    await fs.mkdir(path.join(sessionPath, "workspace"));
    await fs.writeFile(path.join(sessionPath, "workspace", "old.txt"), "old\n");
    await fs.writeFile(path.join(sessionPath, "session.log"), "log\n");

    const session = await createSession();

    await expect(directoryExists(session.workspacePath)).resolves.toBe(false);
    await expect(fileExists(session.logPath)).resolves.toBe(true);
  });
});

describe("formatSessionArtifacts", () => {
  test("prints a machine-readable session line", () => {
    expect(
      formatSessionArtifacts({
        id: "abc",
        path: "/tmp/.shipskip/abc",
        workspacePath: "/tmp/.shipskip/abc/workspace",
        logPath: "/tmp/.shipskip/abc/session.log",
      }),
    ).toBe(
      '\nSHIPSKIP_SESSION={"id":"abc","path":"/tmp/.shipskip/abc","workspacePath":"/tmp/.shipskip/abc/workspace","logPath":"/tmp/.shipskip/abc/session.log"}',
    );
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

async function directoryExists(directoryPath: string) {
  try {
    return (await fs.stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
