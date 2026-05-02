import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, test } from "bun:test";

import {
  assertRealPathInsideWorkspace,
  assertSafeWorkspaceRoot,
  formatRelativePath,
  initializeWorkspaceGitRepository,
  resolveExistingWorkspaceDirectory,
  resolveExistingWorkspaceFile,
  resolveWorkspacePath,
} from "./workspace";

const execFileAsync = promisify(execFile);

describe("resolveWorkspacePath", () => {
  test("resolves paths inside the workspace", () => {
    expect(resolveWorkspacePath("/workspace", "src/index.ts")).toEqual({
      absolutePath: "/workspace/src/index.ts",
      relativePath: "src/index.ts",
    });
  });

  test("rejects paths outside the workspace", () => {
    expect(() => resolveWorkspacePath("/workspace", "../outside.ts")).toThrow(
      "Path must be inside workspace: ../outside.ts",
    );
  });
});

describe("resolveExistingWorkspaceFile", () => {
  test("resolves real file paths inside the workspace", async () => {
    const workspaceRoot = await makeTempDirectory();
    const filePath = path.join(workspaceRoot, "src", "index.ts");
    await fs.mkdir(path.dirname(filePath));
    await fs.writeFile(filePath, "export {};\n");

    await expect(
      resolveExistingWorkspaceFile(workspaceRoot, "src/index.ts"),
    ).resolves.toEqual({
      absolutePath: await fs.realpath(filePath),
      relativePath: "src/index.ts",
    });
  });

  test("rejects symlinks that resolve outside the workspace", async () => {
    const workspaceRoot = await makeTempDirectory();
    const outsideRoot = await makeTempDirectory();
    const outsideFile = path.join(outsideRoot, "secret.txt");
    await fs.writeFile(outsideFile, "secret\n");
    await fs.symlink(outsideFile, path.join(workspaceRoot, "link.txt"));

    await expect(
      resolveExistingWorkspaceFile(workspaceRoot, "link.txt"),
    ).rejects.toThrow("Resolved file must be inside workspace: link.txt");
  });
});

describe("resolveExistingWorkspaceDirectory", () => {
  test("resolves real directory paths inside the workspace", async () => {
    const workspaceRoot = await makeTempDirectory();
    const directoryPath = path.join(workspaceRoot, "src");
    await fs.mkdir(directoryPath);

    await expect(
      resolveExistingWorkspaceDirectory(workspaceRoot, "src"),
    ).resolves.toEqual({
      absolutePath: await fs.realpath(directoryPath),
      relativePath: "src",
    });
  });

  test("rejects missing directories", async () => {
    const workspaceRoot = await makeTempDirectory();

    await expect(
      resolveExistingWorkspaceDirectory(workspaceRoot, "missing"),
    ).rejects.toThrow("Directory does not exist: missing");
  });

  test("rejects files when a directory is expected", async () => {
    const workspaceRoot = await makeTempDirectory();
    await fs.writeFile(path.join(workspaceRoot, "file.txt"), "content\n");

    await expect(
      resolveExistingWorkspaceDirectory(workspaceRoot, "file.txt"),
    ).rejects.toThrow("Path is not a directory: file.txt");
  });

  test("rejects symlinked directories outside the workspace", async () => {
    const workspaceRoot = await makeTempDirectory();
    const outsideRoot = await makeTempDirectory();
    await fs.symlink(outsideRoot, path.join(workspaceRoot, "outside"));

    await expect(
      resolveExistingWorkspaceDirectory(workspaceRoot, "outside"),
    ).rejects.toThrow("Resolved directory must be inside workspace: outside");
  });
});

describe("assertRealPathInsideWorkspace", () => {
  test("allows real paths inside the workspace", async () => {
    const workspaceRoot = await makeTempDirectory();
    const filePath = path.join(workspaceRoot, "file.txt");
    await fs.writeFile(filePath, "content\n");

    await expect(
      assertRealPathInsideWorkspace(workspaceRoot, filePath, "file.txt"),
    ).resolves.toBeUndefined();
  });

  test("rejects real paths outside the workspace", async () => {
    const workspaceRoot = await makeTempDirectory();
    const outsideRoot = await makeTempDirectory();

    await expect(
      assertRealPathInsideWorkspace(workspaceRoot, outsideRoot, "outside", "path"),
    ).rejects.toThrow("Resolved path must be inside workspace: outside");
  });
});

describe("formatRelativePath", () => {
  test("normalizes platform separators to forward slashes", () => {
    expect(formatRelativePath(["src", "lib", "utils.ts"].join(path.sep))).toBe(
      "src/lib/utils.ts",
    );
  });
});

describe("assertSafeWorkspaceRoot", () => {
  test("rejects relative workspace roots", () => {
    expect(() => assertSafeWorkspaceRoot("relative/path")).toThrow(
      "Workspace root must be absolute: relative/path",
    );
  });

  test("rejects missing workspace roots", () => {
    const missingRoot = path.join(os.tmpdir(), "shipskip-missing-workspace-root");

    expect(() => assertSafeWorkspaceRoot(missingRoot)).toThrow(
      `Workspace path does not exist: ${missingRoot}`,
    );
  });

  test("rejects filesystem root", () => {
    expect(() => assertSafeWorkspaceRoot(path.parse(process.cwd()).root)).toThrow(
      "Refusing to operate at filesystem root.",
    );
  });
});

describe("initializeWorkspaceGitRepository", () => {
  test("creates an initial commit for workspace files", async () => {
    const workspacePath = await makeTempDirectory();
    await fs.writeFile(path.join(workspacePath, "README.md"), "# Test\n");

    await initializeWorkspaceGitRepository(workspacePath);

    await expect(git(workspacePath, ["rev-parse", "--is-inside-work-tree"]))
      .resolves.toBe("true");
    await expect(git(workspacePath, ["log", "--format=%s", "-1"]))
      .resolves.toBe("Initial workspace");
    await expect(git(workspacePath, ["status", "--short"]))
      .resolves.toBe("");
  });

  test("creates an initial commit for empty workspaces", async () => {
    const workspacePath = await makeTempDirectory();

    await initializeWorkspaceGitRepository(workspacePath);

    await expect(git(workspacePath, ["log", "--format=%s", "-1"]))
      .resolves.toBe("Initial workspace");
  });

  test("creates an initial commit without global git author config", async () => {
    const workspacePath = await makeTempDirectory();
    const gitConfigHome = await makeTempDirectory();
    await fs.writeFile(path.join(workspacePath, "README.md"), "# Test\n");

    await initializeWorkspaceGitRepository(workspacePath);

    await expect(
      git(workspacePath, ["log", "--format=%an <%ae>", "-1"], {
        GIT_CONFIG_GLOBAL: path.join(gitConfigHome, ".gitconfig"),
        GIT_CONFIG_NOSYSTEM: "1",
      }),
    ).resolves.toBe("shipskip <shipskip@example.com>");
  });
});

async function git(
  workspacePath: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: workspacePath,
    env: {
      ...process.env,
      ...env,
    },
  });

  return stdout.trim();
}

async function makeTempDirectory() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "shipskip-test-"));
}
