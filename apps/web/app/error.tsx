"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-content container mx-auto flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Error
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm">
          {error.digest
            ? `Error ID: ${error.digest}`
            : "An unexpected error occurred."}
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
