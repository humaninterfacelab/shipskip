import "dotenv/config";

import { notInArray } from "drizzle-orm";
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

  for (const row of rows) {
    await db
      .insert(submissions)
      .values({
        id: row.id,
        model: row.model,
        submittedBy: row.submitted_by ?? null,
        taskId: row.task,
      })
      .onConflictDoUpdate({
        target: submissions.id,
        set: {
          model: row.model,
          submittedBy: row.submitted_by ?? null,
          taskId: row.task,
        },
      });

    await db
      .insert(modelRatings)
      .values({ model: row.model })
      .onConflictDoNothing();
  }

  if (ids.length > 0) {
    await db.delete(submissions).where(notInArray(submissions.id, ids));
  } else {
    await db.delete(submissions);
  }

  console.log(`Synced ${rows.length} submissions`);
}

await main();
