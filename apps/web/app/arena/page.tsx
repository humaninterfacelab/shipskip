"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { FeedbackPanel } from "@/components/feedback-panel";
import { OptionPanel } from "@/components/option-panel";
import { Button } from "@/components/ui/button";
import { ViewMode, ViewToggle } from "@/components/view-toggle";
import { cn } from "@/lib/utils";

const previewUrl = "https://afa7826e.shipskip.pages.dev/";

export default function ArenaPage() {
  const [selectedOption, setSelectedOption] = useState<"a" | "b" | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] w-full flex-col justify-evenly">
      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg leading-tight font-medium">
            Software Engineer Portfolio
          </h1>
          <p className="text-muted-foreground text-sm">
            Compare two generated UIs for the same brief. Choose the one you
            would ship.
          </p>
        </div>

        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      <div className="relative flex items-center gap-6 p-px">
        <OptionPanel
          src={previewUrl}
          option="a"
          viewMode={viewMode}
          setViewMode={setViewMode}
          onSelect={setSelectedOption}
          isSelected={selectedOption == "a" ? true : false}
        />
        <OptionPanel
          src={previewUrl}
          option="b"
          viewMode={viewMode}
          setViewMode={setViewMode}
          onSelect={setSelectedOption}
          isSelected={selectedOption == "b" ? true : false}
        />
        <p className="bg-background absolute left-1/2 z-10 -translate-x-1/2 rounded-full border p-2 text-xs font-medium shadow-sm">
          vs.
        </p>
      </div>

      <div
        aria-hidden={!selectedOption}
        className={cn(
          "flex items-end justify-between transition-opacity duration-300 ease-out",
          selectedOption
            ? "opacity-100"
            : "pointer-events-none opacity-0 select-none",
        )}
      >
        <FeedbackPanel />

        <Button
          size="lg"
          disabled={!selectedOption}
          className="hover:bg-primary/90 flex items-center"
        >
          Next comparison
          <ChevronRight />
        </Button>
      </div>
    </main>
  );
}
