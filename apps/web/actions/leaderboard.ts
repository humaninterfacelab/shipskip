"use server";

import { desc, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { modelRatings } from "@/lib/db/schema";

export async function fetchLeaderboard() {
  return db
    .select()
    .from(modelRatings)
    .where(ne(modelRatings.matches, 0))
    .orderBy(desc(modelRatings.rating), desc(modelRatings.matches));
}
