export default function ArenaPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="w-full flex-col justify-center">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Arena</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Submission arena
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Review and compare shipskip submissions as they are published.
        </p>
      </section>
    </main>
  );
}
