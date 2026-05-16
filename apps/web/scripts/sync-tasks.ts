import "dotenv/config";

import taskRegistry from "@shipskip/tasks/task-registry.json";
import { notInArray } from "drizzle-orm";
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

  for (const row of rows) {
    await db
      .insert(tasks)
      .values({
        id: row.id,
        template: row.template,
        title: row.title,
        prompt: row.prompt,
        systemPrompt: row.systemPrompt,
      })
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          template: row.template,
          title: row.title,
          prompt: row.prompt,
          systemPrompt: row.systemPrompt,
        },
      });
  }

  if (ids.length > 0) {
    await db.delete(tasks).where(notInArray(tasks.id, ids));
  } else {
    await db.delete(tasks);
  }

  console.log(`Synced ${rows.length} tasks`);
}

await main();
