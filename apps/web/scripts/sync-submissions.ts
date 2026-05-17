import "dotenv/config";

import { notInArray, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@/lib/db/client";
import { modelRatings, submissions } from "@/lib/db/schema";

const SubmissionSchema = z
  .object({
    id: z.string(),
    model: z.string(),
    task: z.string(),
    submitted_by: z.string().optional(),
  })
  .loose();

type Submission = z.infer<typeof SubmissionSchema>;

async function parseJsonl(): Promise<Submission[]> {
  const file = Bun.file(new URL("../../../submissions.jsonl", import.meta.url));
  const text = await file.text();

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => SubmissionSchema.parse(JSON.parse(line)));
}

async function main() {
  const rows = await parseJsonl();

  const ids = rows.map((row) => row.id);

  await db.transaction(async (tx) => {
    if (rows.length === 0) {
      await tx.delete(submissions);
      await tx.delete(modelRatings);
      return;
    }

    await tx
      .insert(submissions)
      .values(
        rows.map((row) => ({
          id: row.id,
          model: row.model,
          submittedBy: row.submitted_by ?? null,
          taskId: row.task,
        })),
      )
      .onConflictDoUpdate({
        target: submissions.id,
        set: {
          model: sql`excluded.model`,
          submittedBy: sql`excluded.submitted_by`,
          taskId: sql`excluded.task_id`,
        },
      });

    await tx
      .insert(modelRatings)
      .values(
        [...new Set(rows.map((row) => row.model))].map((model) => ({ model })),
      )
      .onConflictDoNothing();

    await tx.delete(submissions).where(notInArray(submissions.id, ids));
    await tx.delete(modelRatings).where(
      notInArray(
        modelRatings.model,
        rows.map((row) => row.model),
      ),
    );
  });

  console.log(`Synced ${rows.length} submissions`);
}

await main();
