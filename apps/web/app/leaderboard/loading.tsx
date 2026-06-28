import { LoaderCircle } from "lucide-react";

export default function LeaderboardLoading() {
  return (
    <main className="min-h-content container mx-auto flex items-center justify-center">
      <LoaderCircle className="text-muted-foreground size-6 animate-spin" />
    </main>
  );
}
