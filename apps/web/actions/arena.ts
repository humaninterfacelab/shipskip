"use server";

import { and, desc, eq, InferInsertModel, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  feedbacks,
  modelRatings,
  submissions,
  tasks,
  votes,
} from "@/lib/db/schema";

const K_FACTOR = 32;

type MatchupCandidate = {
  submission: typeof submissions.$inferSelect;
  task: typeof tasks.$inferSelect;
  rating: number;
  matches: number;
};

function expectedScore(rating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

function calculateElo(winnerRating: number, loserRating: number) {
  const winnerExpected = expectedScore(winnerRating, loserRating);
  const loserExpected = expectedScore(loserRating, winnerRating);

  return {
    winnerRating: Math.round(winnerRating + K_FACTOR * (1 - winnerExpected)),
    loserRating: Math.round(loserRating + K_FACTOR * (0 - loserExpected)),
  };
}

function chooseBestPair(candidates: MatchupCandidate[]) {
  const byTask = new Map<string, MatchupCandidate[]>();

  for (const candidate of candidates) {
    const existing = byTask.get(candidate.submission.taskId) ?? [];
    existing.push(candidate);
    byTask.set(candidate.submission.taskId, existing);
  }

  let bestPair: readonly [MatchupCandidate, MatchupCandidate] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const taskCandidates of byTask.values()) {
    for (let i = 0; i < taskCandidates.length; i++) {
      for (let j = i + 1; j < taskCandidates.length; j++) {
        const a = taskCandidates[i];
        const b = taskCandidates[j];

        if (a.submission.model === b.submission.model) continue;

        const ratingGap = Math.abs(a.rating - b.rating);
        const exposure = a.matches + b.matches;
        const score = ratingGap + exposure * 8 + Math.random() * 50;

        if (score < bestScore) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }
  }

  return bestPair;
}

export async function fetchRandomPair() {
  const candidates = await db
    .select({
      submission: submissions,
      task: tasks,
      rating: modelRatings.rating,
      matches: modelRatings.matches,
    })
    .from(submissions)
    .innerJoin(tasks, eq(submissions.taskId, tasks.id))
    .innerJoin(modelRatings, eq(submissions.model, modelRatings.model))
    .orderBy(sql`random()`)
    .limit(80);

  const smartPair = chooseBestPair(candidates);

  if (smartPair) {
    return smartPair.map(({ submission, task }) => ({ submission, task })) as [
      {
        submission: typeof submissions.$inferSelect;
        task: typeof tasks.$inferSelect;
      },
      {
        submission: typeof submissions.$inferSelect;
        task: typeof tasks.$inferSelect;
      },
    ];
  }

  const [a] = await db
    .select({
      submission: submissions,
      task: tasks,
    })
    .from(submissions)
    .innerJoin(tasks, eq(submissions.taskId, tasks.id))
    .innerJoin(modelRatings, eq(submissions.model, modelRatings.model))
    .orderBy(sql`random()`)
    .limit(1);

  if (!a) return null;

  const [b] = await db
    .select({
      submission: submissions,
      task: tasks,
    })
    .from(submissions)
    .innerJoin(tasks, eq(submissions.taskId, tasks.id))
    .innerJoin(modelRatings, eq(submissions.model, modelRatings.model))
    .where(
      and(
        eq(submissions.taskId, a.submission.taskId),
        ne(submissions.id, a.submission.id),
        ne(submissions.model, a.submission.model),
      ),
    )
    .orderBy(sql`random()`)
    .limit(1);

  if (!b) return null;

  return [a, b] as const;
}

type Vote = InferInsertModel<typeof votes>;

export async function vote(voteInput: Vote) {
  const [insertedVote] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(votes)
      .values(voteInput)
      .returning({ id: votes.id });

    const [winner] = await tx
      .select()
      .from(modelRatings)
      .where(eq(modelRatings.model, voteInput.shipModel))
      .limit(1);
    const [loser] = await tx
      .select()
      .from(modelRatings)
      .where(eq(modelRatings.model, voteInput.skipModel))
      .limit(1);

    if (!winner || !loser) {
      throw new Error(
        "Missing model rating for vote models. Run submission sync.",
      );
    }

    const { winnerRating, loserRating } = calculateElo(
      winner.rating,
      loser.rating,
    );
    const updatedAt = new Date();

    await tx
      .update(modelRatings)
      .set({
        rating: winnerRating,
        wins: winner.wins + 1,
        losses: winner.losses,
        matches: winner.matches + 1,
        updatedAt,
      })
      .where(eq(modelRatings.model, voteInput.shipModel));

    await tx
      .update(modelRatings)
      .set({
        rating: loserRating,
        wins: loser.wins,
        losses: loser.losses + 1,
        matches: loser.matches + 1,
        updatedAt,
      })
      .where(eq(modelRatings.model, voteInput.skipModel));

    return [inserted];
  });

  return insertedVote.id;
}

export async function fetchLeaderboard() {
  return db
    .select()
    .from(modelRatings)
    .orderBy(desc(modelRatings.rating), desc(modelRatings.matches));
}

type Feedback = InferInsertModel<typeof feedbacks>;

export async function feedback(feedback: Feedback) {
  await db.insert(feedbacks).values(feedback);
}
