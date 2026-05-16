import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  template: text("template").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    model: text("model").notNull(),
    submittedBy: text("submitted_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, {
        onDelete: "cascade",
      }),
  },
  (table) => [
    index("submissions_task_idx").on(table.taskId),
    index("submissions_model_idx").on(table.model),
  ],
);

export const votes = pgTable("votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipModel: text("ship_model").notNull(),
  skipModel: text("skip_model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, {
      onDelete: "cascade",
    }),
});

export const modelRatings = pgTable("model_ratings", {
  model: text("model").primaryKey(),
  rating: integer("rating").default(1500).notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  matches: integer("matches").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  voteId: uuid("vote_id")
    .notNull()
    .references(() => votes.id, {
      onDelete: "cascade",
    }),

  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
