import { fetchRandomPair } from "@/actions/arena";

import { ArenaClient } from "./arena-client";

export const dynamic = "force-dynamic";

export default async function ArenaPage() {
  const pair = await fetchRandomPair();

  if (!pair) return <main>No pairs found!</main>;

  const key = `${pair[0].submission.id}:${pair[1].submission.id}`;
  return <ArenaClient pair={pair} key={key} />;
}
