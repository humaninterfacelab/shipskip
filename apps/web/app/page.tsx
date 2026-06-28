import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <section className="min-h-content container mx-auto flex max-w-4xl flex-col justify-center gap-8 py-20">
        <div className="flex flex-col gap-5">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Frontend evaluation
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance md:text-6xl">
            Compare two generated UIs. Ship the stronger one.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg leading-8 text-pretty">
            shipskip helps you review AI-generated frontend submissions side by
            side.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="outline">
            <Link href="/arena">Open arena</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/leaderboard">View leaderboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
