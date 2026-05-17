"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { Reason } from "@/components/feedback-panel";
import { db } from "@/lib/db";
import {
  feedbacks,
  modelRatings,
  submissions,
  tasks,
  votes,
} from "@/lib/db/schema";

const K_FACTOR = 32;

const feedbackReasons = new Set([
  "Good colours",
  "Consistent design",
  "Mobile friendly",
  "Good content",
  "Good animations",
  "Accessible",
  "Easy to use",
]);

type VoteInput = {
  shipSubmissionId: string;
  skipSubmissionId: string;
  feedbackReasons?: string[];
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

export async function fetchRandomPair() {
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

const validFeedbackReasons = new Set(feedbackReasons);

function normaliseFeedbackReasons(reasons?: string[]) {
  if (!reasons?.length) return null;

  const uniqueReasons = [...new Set(reasons)];

  const hasInvalidReason = uniqueReasons.some(
    (reason) => !validFeedbackReasons.has(reason as Reason),
  );

  if (hasInvalidReason) {
    throw new Error("Invalid feedback reasons.");
  }

  return uniqueReasons.join(",");
}

export async function vote(voteInput: VoteInput) {
  if (voteInput.shipSubmissionId === voteInput.skipSubmissionId) {
    throw new Error("Invalid vote.");
  }

  const feedbackContent = normaliseFeedbackReasons(voteInput.feedbackReasons);

  const insertedVoteId = await db.transaction(async (tx) => {
    const selectedSubmissions = await tx
      .select()
      .from(submissions)
      .where(
        inArray(submissions.id, [
          voteInput.shipSubmissionId,
          voteInput.skipSubmissionId,
        ]),
      );

    const shipped = selectedSubmissions.find(
      (submission) => submission.id === voteInput.shipSubmissionId,
    );
    const skipped = selectedSubmissions.find(
      (submission) => submission.id === voteInput.skipSubmissionId,
    );

    if (!shipped || !skipped) {
      throw new Error("Invalid vote submissions.");
    }

    if (shipped.taskId !== skipped.taskId) {
      throw new Error("Vote submissions must belong to the same task.");
    }

    if (shipped.model === skipped.model) {
      throw new Error("Vote submissions must use different models.");
    }

    await tx.execute(
      sql`select "model" from "model_ratings" where "model" in (${shipped.model}, ${skipped.model}) order by "model" for update`,
    );

    const [inserted] = await tx
      .insert(votes)
      .values({
        shipModel: shipped.model,
        skipModel: skipped.model,
        taskId: shipped.taskId,
      })
      .returning({ id: votes.id });

    const [winner] = await tx
      .select()
      .from(modelRatings)
      .where(eq(modelRatings.model, shipped.model))
      .limit(1);
    const [loser] = await tx
      .select()
      .from(modelRatings)
      .where(eq(modelRatings.model, skipped.model))
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
      .where(eq(modelRatings.model, shipped.model));

    await tx
      .update(modelRatings)
      .set({
        rating: loserRating,
        wins: loser.wins,
        losses: loser.losses + 1,
        matches: loser.matches + 1,
        updatedAt,
      })
      .where(eq(modelRatings.model, skipped.model));

    if (feedbackContent) {
      await tx.insert(feedbacks).values({
        voteId: inserted.id,
        content: feedbackContent,
      });
    }

    return inserted.id;
  });

  return insertedVoteId;
}
