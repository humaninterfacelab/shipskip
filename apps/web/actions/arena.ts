"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  feedbacks,
  modelRatings,
  submissions,
  tasks,
  votes,
} from "@/lib/db/schema";
import { type FeedbackReason, feedbackReasons } from "@/lib/feedback";

const K_FACTOR = 32;

type VoteInput = {
  shipSubmissionId: string;
  skipSubmissionId: string;
  feedbackReasons?: string[];
};

function calculateElo(winnerRating: number, loserRating: number) {
  const winnerExpected = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  return {
    winnerRating: Math.round(winnerRating + K_FACTOR * (1 - winnerExpected)),
    loserRating: Math.round(loserRating + K_FACTOR * (winnerExpected - 1)),
  };
}

export async function fetchRandomPair() {
  const randomSubmissionQuery = () =>
    db
      .select({
        submission: submissions,
        task: tasks,
      })
      .from(submissions)
      .innerJoin(tasks, eq(submissions.taskId, tasks.id))
      .innerJoin(modelRatings, eq(submissions.model, modelRatings.model));

  const [a] = await randomSubmissionQuery()
    .orderBy(sql`random()`)
    .limit(1);

  if (!a) return null;

  const [b] = await randomSubmissionQuery()
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

const validFeedbackReasons = new Set<FeedbackReason>(feedbackReasons);

function normaliseFeedbackReasons(reasons?: string[]) {
  if (!reasons?.length) return null;
  const unique = [...new Set(reasons)];
  if (unique.some((r) => !validFeedbackReasons.has(r as FeedbackReason))) {
    throw new Error("Invalid feedback reasons.");
  }
  return unique.join(",");
}

export async function vote(voteInput: VoteInput) {
  if (voteInput.shipSubmissionId === voteInput.skipSubmissionId) {
    throw new Error("Invalid vote.");
  }

  const feedbackContent = normaliseFeedbackReasons(voteInput.feedbackReasons);

  await db.transaction(async (tx) => {
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

    const ratingRows = await tx
      .select()
      .from(modelRatings)
      .where(inArray(modelRatings.model, [shipped.model, skipped.model]))
      .orderBy(modelRatings.model)
      .for("update");

    const [inserted] = await tx
      .insert(votes)
      .values({
        shipModel: shipped.model,
        skipModel: skipped.model,
        taskId: shipped.taskId,
      })
      .returning({ id: votes.id });

    if (!inserted) {
      throw new Error("Failed to record vote.");
    }

    const winner = ratingRows.find((row) => row.model === shipped.model);
    const loser = ratingRows.find((row) => row.model === skipped.model);

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
        matches: winner.matches + 1,
        updatedAt,
      })
      .where(eq(modelRatings.model, shipped.model));

    await tx
      .update(modelRatings)
      .set({
        rating: loserRating,
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
  });
}
