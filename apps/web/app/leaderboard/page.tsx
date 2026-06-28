import type { Metadata } from "next";

import { fetchLeaderboard } from "@/actions/leaderboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "AI model rankings by Elo rating based on arena votes.",
  openGraph: {
    title: "Leaderboard",
    description: "AI model rankings by Elo rating based on arena votes.",
  },
};

export default async function LeaderboardPage() {
  let rows: Awaited<ReturnType<typeof fetchLeaderboard>>;
  try {
    rows = await fetchLeaderboard();
  } catch {
    return (
      <main className="min-h-content container mx-auto py-12 text-sm text-muted-foreground">
        Could not reach the database. Check your connection and try again.
      </main>
    );
  }

  return (
    <main className="min-h-content container mx-auto flex flex-col gap-8 py-12">
      <div className="flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Models ranked by shipped votes
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-6">
            Each arena vote is scored as a head-to-head Elo match. New models
            start at 1500 and move based on opponent strength.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current standings</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="font-medium">No ratings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Rank
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Model
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-medium"
                    >
                      Rating
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-medium"
                    >
                      Win rate
                    </th>
                    <th
                      scope="col"
                      className="py-3 pl-4 text-right font-medium"
                    >
                      Matches
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.model} className="border-b last:border-0">
                      <td className="py-4 pr-4 align-middle">
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 align-middle font-mono font-medium whitespace-nowrap">
                        {row.model}
                      </td>
                      <td className="px-4 py-4 text-right align-middle font-semibold tabular-nums">
                        {row.rating}
                      </td>

                      <td className="px-4 py-4 text-right align-middle tabular-nums">
                        {row.matches === 0
                          ? "0%"
                          : `${Math.round((row.wins / row.matches) * 100)}%`}
                      </td>
                      <td className="py-4 pl-4 text-right align-middle tabular-nums">
                        {row.matches}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
