import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

const REPO_URL = "https://github.com/humaninterfacelab/shipskip";

const STEPS = [
  {
    title: "Same prompt",
    description: "Models build from one brief.",
  },
  {
    title: "Blind preview",
    description: "Names stay hidden while people compare.",
  },
  {
    title: "Real use",
    description: "Desktop and mobile both get checked.",
  },
  {
    title: "Ship vote",
    description: "People pick what feels ready.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="font-semibold">shipskip</span>

          <div className="flex items-center gap-4">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-16 sm:px-6 lg:py-24">
        <section className="max-w-3xl space-y-8">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Would you ship it?
            </h1>
            <p className="text-muted-foreground text-lg leading-8">
              Compare live AI-generated frontend UIs from the same prompt. Vote
              blind on what feels ready to ship.
            </p>
            <p className="text-muted-foreground text-sm">
              Human preference, not objective model ranking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" disabled>
              Blind Vote
            </Button>
            <Button variant="outline" size="lg" disabled>
              Results
            </Button>
          </div>
        </section>

        <section className="mt-16 space-y-6 border-t pt-10 lg:mt-24">
          <h2 className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="space-y-2">
                <div className="text-muted-foreground text-sm font-medium">
                  Step {index + 1}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:h-16 md:flex-row md:py-0">
          <p className="text-muted-foreground text-center text-sm md:text-left">
            An open-source research project.
          </p>
          <p className="text-muted-foreground text-sm">MIT License</p>
        </div>
      </footer>
    </div>
  );
}
