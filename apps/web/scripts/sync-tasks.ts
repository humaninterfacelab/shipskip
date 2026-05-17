import "dotenv/config";

import taskRegistry from "@shipskip/tasks/task-registry.json";
import { notInArray, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";

const TaskSchema = z.object({
  template: z.string(),
  title: z.string(),
  systemPrompt: z.string(),
  prompt: z.string(),
});

const TasksSchema = z.record(z.string(), TaskSchema);

type Task = z.infer<typeof TaskSchema> & {
  id: string;
};

async function parseJson(): Promise<Task[]> {
  const parsed = TasksSchema.parse(taskRegistry);

  return Object.entries(parsed).map(([id, task]) => ({
    id,
    ...task,
  }));
}

async function main() {
  const rows = await parseJson();

  const ids = rows.map((row) => row.id);

  await db.transaction(async (tx) => {
    if (rows.length === 0) {
      await tx.delete(tasks);
      return;
    }

    await tx
      .insert(tasks)
      .values(rows)
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          template: sql`excluded.template`,
          title: sql`excluded.title`,
          prompt: sql`excluded.prompt`,
          systemPrompt: sql`excluded.system_prompt`,
        },
      });

    await tx.delete(tasks).where(notInArray(tasks.id, ids));
  });

  console.log(`Synced ${rows.length} tasks`);
}

await main();
