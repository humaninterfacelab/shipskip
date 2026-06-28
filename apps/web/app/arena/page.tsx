import type { Metadata } from "next";

import { fetchRandomPair } from "@/actions/arena";

import { ArenaClient } from "./arena-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena",
  description: "Vote on AI-generated frontend submissions head-to-head.",
  openGraph: {
    title: "Arena",
    description: "Vote on AI-generated frontend submissions head-to-head.",
  },
};

export default async function ArenaPage() {
  let pair;
  try {
    pair = await fetchRandomPair();
  } catch {
    return (
      <main className="container mx-auto py-12 text-sm text-muted-foreground">
        Could not reach the database. Check your connection and try again.
      </main>
    );
  }

  if (!pair) {
    return (
      <main className="container mx-auto py-12 text-sm text-muted-foreground">
        No matchups available yet.
      </main>
    );
  }

  const key = `${pair[0].submission.id}:${pair[1].submission.id}`;
  return <ArenaClient pair={pair} key={key} />;
}
