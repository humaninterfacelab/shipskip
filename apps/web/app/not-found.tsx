import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-content container mx-auto flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground text-sm">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </main>
  );
}
