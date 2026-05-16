import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/arena", label: "Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  return (
    <header className="bg-background/90 sticky top-0 z-50 w-full border-b">
      <nav className="container mx-auto flex h-14 w-full items-center justify-between">
        <Link
          href="/"
          className="hover:text-muted-foreground text-base font-extrabold tracking-tight transition-colors"
        >
          shipskip
        </Link>

        <div className="flex items-center gap-2">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="justify-end gap-1">
              {navItems.map((item) => {
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        className={cn(navigationMenuTriggerStyle())}
                      >
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
