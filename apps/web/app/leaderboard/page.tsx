import { fetchLeaderboard } from "@/actions/leaderboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function winRate(wins: number, matches: number) {
  if (matches === 0) return "0%";

  return `${Math.round((wins / matches) * 100)}%`;
}

export default async function LeaderboardPage() {
  const rows = await fetchLeaderboard();

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col gap-8 py-12">
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
                    <th className="py-3 pr-4 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 text-right font-medium">Rating</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Win rate
                    </th>
                    <th className="py-3 pl-4 text-right font-medium">
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
                        {winRate(row.wins, row.matches)}
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
