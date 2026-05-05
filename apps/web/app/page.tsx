import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            shipskip
          </Link>
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-2">
              <NavigationMenuItem>
                <ThemeToggle />
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={buttonVariants({ variant: "default" })}
                >
                  <Link href="/arena">Arena</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
            shipskip
          </h1>
        </div>
      </section>
    </main>
  );
}
