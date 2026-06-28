import "dotenv/config";

import { readdir, readFile } from "node:fs/promises";

import { notInArray, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@/lib/db/client";
import { modelRatings, submissions, tasks } from "@/lib/db/schema";

import taskRegistry from "../../../packages/tasks/registry.json";

const SubmissionSchema = z
  .object({
    id: z.string().regex(/^[0-9a-f]{8}$/),
    model: z.string().min(1),
    task: z.string().min(1),
    run_id: z.number().int().positive(),
    run_attempt: z.number().int().positive(),
    source_sha: z.string().regex(/^[0-9a-f]{40}$/),
  })
  .strict();

type SubmissionRow = z.infer<typeof SubmissionSchema>;

function flattenRegistry() {
  return Object.entries(taskRegistry).flatMap(([dataset, datasetTasks]) =>
    Object.entries(datasetTasks).map(([taskId, { title }]) => ({
      id: `${dataset}/${taskId}`,
      title,
    })),
  );
}

async function readSubmissions(): Promise<SubmissionRow[]> {
  const dir = new URL("../../../submissions", import.meta.url).pathname;
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const rows: SubmissionRow[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const text = await readFile(`${dir}/${file}`, "utf8");
    rows.push(SubmissionSchema.parse(JSON.parse(text)));
  }
  return rows;
}

async function main() {
  const taskRows = flattenRegistry();
  const submissionRows = await readSubmissions();
  const taskIds = taskRows.map((t) => t.id);
  const taskIdSet = new Set(taskIds);
  const submissionIds = submissionRows.map((s) => s.id);
  const models = [...new Set(submissionRows.map((s) => s.model))];

  const unknownTasks = [
    ...new Set(
      submissionRows.map((s) => s.task).filter((t) => !taskIdSet.has(t)),
    ),
  ];
  if (unknownTasks.length > 0) {
    throw new Error(`Unknown submission tasks: ${unknownTasks.join(", ")}`);
  }

  await db.transaction(async (tx) => {
    if (taskRows.length > 0) {
      await tx
        .insert(tasks)
        .values(taskRows)
        .onConflictDoUpdate({
          target: tasks.id,
          set: { title: sql`excluded.title` },
        });
    }

    if (submissionRows.length > 0) {
      await tx
        .insert(submissions)
        .values(
          submissionRows.map((s) => ({
            id: s.id,
            model: s.model,
            taskId: s.task,
          })),
        )
        .onConflictDoUpdate({
          target: submissions.id,
          set: { model: sql`excluded.model`, taskId: sql`excluded.task_id` },
        });

      await tx
        .insert(modelRatings)
        .values(models.map((model) => ({ model })))
        .onConflictDoNothing();
    }

    await tx
      .delete(submissions)
      .where(
        submissionIds.length > 0
          ? notInArray(submissions.id, submissionIds)
          : sql`true`,
      );
    await tx
      .delete(modelRatings)
      .where(
        models.length > 0 ? notInArray(modelRatings.model, models) : sql`true`,
      );
    await tx
      .delete(tasks)
      .where(taskIds.length > 0 ? notInArray(tasks.id, taskIds) : sql`true`);
  });

  console.log(
    `Synced ${taskRows.length} tasks and ${submissionRows.length} submissions`,
  );
}

await main();
