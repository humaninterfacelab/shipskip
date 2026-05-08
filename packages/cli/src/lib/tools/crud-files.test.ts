import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { createCrudFileTools } from "./crud-files";

type ReadFilesExecute = (input: { paths: string[] }) => Promise<
  Array<{
    path: string;
    content: string;
  }>
>;

type WriteFilesExecute = (input: {
  files: Array<{
    path: string;
    content: string;
  }>;
}) => Promise<
  Array<{
    success: boolean;
    path: string;
  }>
>;

type MoveFilesExecute = (input: {
  moves: Array<{
    from: string;
    to: string;
  }>;
}) => Promise<
  Array<{
    success: boolean;
    from: string;
    to: string;
  }>
>;

type DeleteFilesExecute = (input: {
  paths: string[];
  recursive?: boolean;
}) => Promise<
  Array<{
    success: boolean;
    deleted: string;
  }>
>;

describe("crud file tools", () => {
  test("reads and writes files inside the workspace", async () => {
    const workspace = await makeWorkspace();

    await writeFiles(workspace, {
      files: [{ path: "src/index.ts", content: "export {};\n" }],
    });

    const result = await readFiles(workspace, { paths: ["src/index.ts"] });

    expect(result).toEqual([
      {
        path: "src/index.ts",
        content: "export {};\n",
      },
    ]);
  });

  test("rejects reading symlinks that resolve outside the workspace", async () => {
    const workspace = await makeWorkspace();
    const outside = await makeWorkspace();

    await fs.writeFile(path.join(outside, "secret.txt"), "secret", "utf8");
    await fs.symlink(path.join(outside, "secret.txt"), path.join(workspace, "link.txt"));

    await expect(readFiles(workspace, { paths: ["link.txt"] })).rejects.toThrow(
      "Path escapes workspace: link.txt",
    );
  });

  test("rejects writing through symlinked directories outside the workspace", async () => {
    const workspace = await makeWorkspace();
    const outside = await makeWorkspace();

    await fs.symlink(outside, path.join(workspace, "link"));

    await expect(
      writeFiles(workspace, {
        files: [{ path: "link/created.txt", content: "outside" }],
      }),
    ).rejects.toThrow("Path escapes workspace: link/created.txt");

    await expect(fs.readFile(path.join(outside, "created.txt"), "utf8")).rejects.toThrow();
  });

  test("rejects moving files over existing destinations", async () => {
    const workspace = await makeWorkspace();

    await fs.writeFile(path.join(workspace, "source.txt"), "source", "utf8");
    await fs.writeFile(path.join(workspace, "target.txt"), "target", "utf8");

    await expect(
      moveFiles(workspace, {
        moves: [{ from: "source.txt", to: "target.txt" }],
      }),
    ).rejects.toThrow("Destination already exists: target.txt");

    await expect(fs.readFile(path.join(workspace, "target.txt"), "utf8")).resolves.toBe(
      "target",
    );
  });

  test("rejects deleting the workspace root", async () => {
    const workspace = await makeWorkspace();

    await fs.writeFile(path.join(workspace, "index.ts"), "export {};", "utf8");

    await expect(
      deleteFiles(workspace, { paths: ["."], recursive: true }),
    ).rejects.toThrow("Refusing to delete workspace root: .");

    await expect(fs.readFile(path.join(workspace, "index.ts"), "utf8")).resolves.toBe(
      "export {};",
    );
  });

  test("rejects recursively deleting top-level paths", async () => {
    const workspace = await makeWorkspace();

    await fs.mkdir(path.join(workspace, "src"));
    await fs.writeFile(path.join(workspace, "src/index.ts"), "export {};", "utf8");

    await expect(
      deleteFiles(workspace, { paths: ["src"], recursive: true }),
    ).rejects.toThrow("Refusing to recursively delete top-level path: src");

    await expect(fs.readFile(path.join(workspace, "src/index.ts"), "utf8")).resolves.toBe(
      "export {};",
    );
  });
});

async function readFiles(
  workspace: string,
  input: Parameters<ReadFilesExecute>[0],
) {
  const tools = createCrudFileTools(workspace);
  const execute = tools.readFiles.execute as ReadFilesExecute | undefined;

  if (!execute) {
    throw new Error("readFiles execute function is missing");
  }

  return await execute(input);
}

async function writeFiles(
  workspace: string,
  input: Parameters<WriteFilesExecute>[0],
) {
  const tools = createCrudFileTools(workspace);
  const execute = tools.writeFiles.execute as WriteFilesExecute | undefined;

  if (!execute) {
    throw new Error("writeFiles execute function is missing");
  }

  return await execute(input);
}

async function moveFiles(
  workspace: string,
  input: Parameters<MoveFilesExecute>[0],
) {
  const tools = createCrudFileTools(workspace);
  const execute = tools.moveFiles.execute as MoveFilesExecute | undefined;

  if (!execute) {
    throw new Error("moveFiles execute function is missing");
  }

  return await execute(input);
}

async function deleteFiles(
  workspace: string,
  input: Parameters<DeleteFilesExecute>[0],
) {
  const tools = createCrudFileTools(workspace);
  const execute = tools.deleteFiles.execute as DeleteFilesExecute | undefined;

  if (!execute) {
    throw new Error("deleteFiles execute function is missing");
  }

  return await execute(input);
}

async function makeWorkspace() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "shipskip-test-"));
}
