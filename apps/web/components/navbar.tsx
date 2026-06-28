"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/arena", label: "Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-background/90 sticky top-0 z-50 w-full border-b backdrop-blur-sm">
      <nav className="container mx-auto flex h-14 w-full items-center justify-between">
        <Link
          href="/"
          className="hover:text-muted-foreground text-base font-extrabold tracking-tight transition-colors"
        >
          shipskip
        </Link>
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
