"use client";

import { ChevronRight, LoaderCircle, Monitor, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { fetchRandomPair } from "@/actions/arena";
import { vote } from "@/actions/arena";
import { Button } from "@/components/ui/button";
import { type FeedbackReason, feedbackReasons } from "@/lib/feedback";
import { cn } from "@/lib/utils";

import { OptionCard } from "./option-card";
import type { PreviewMode } from "./preview";

type Pair = NonNullable<Awaited<ReturnType<typeof fetchRandomPair>>>;

export function ArenaClient({ pair }: { pair: Pair }) {
  const [a, b] = pair;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<Set<FeedbackReason>>(
    new Set(),
  );
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [isVoting, startVoting] = useTransition();
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [isLoadingNext, startLoadingNext] = useTransition();
  const router = useRouter();
  const canVote = selectedId !== null && !voteSubmitted;

  const toggleReason = (reason: FeedbackReason) =>
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason);
      else next.add(reason);
      return next;
    });

  const submitVote = () => {
    if (!selectedId || isVoting) return;
    const shipped = a.submission.id === selectedId ? a : b;
    const skipped = shipped === a ? b : a;
    startVoting(async () => {
      try {
        await vote({
          shipSubmissionId: shipped.submission.id,
          skipSubmissionId: skipped.submission.id,
          feedbackReasons: [...selectedReasons],
        });
        toast.success("Vote submitted", {
          description: `You chose to ship ${shipped.submission.model} for ${shipped.task.title}`,
        });
        setVoteSubmitted(true);
        setSelectedReasons(new Set());
      } catch (error) {
        toast.error("Vote not counted", {
          description:
            error instanceof Error ? error.message : "Something went wrong.",
        });
      }
    });
  };

  return (
    <main className="min-h-content container mx-auto flex w-full flex-col justify-center gap-12 py-12">
      {/* Header */}
      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg leading-tight font-medium">
            {a.task.title ?? b.task.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose the one you would ship.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          {(["desktop", "mobile"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "desktop" ? (
                <Monitor className="size-3.5" />
              ) : (
                <Smartphone className="size-3.5" />
              )}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="relative flex items-center gap-4 p-px">
        {(
          [
            { entry: a, label: "Option A" },
            { entry: b, label: "Option B" },
          ] as const
        ).map(({ entry, label }) => (
          <OptionCard
            key={entry.submission.id}
            id={entry.submission.id}
            label={label}
            model={voteSubmitted ? entry.submission.model : null}
            isSelected={selectedId === entry.submission.id}
            voteSubmitted={voteSubmitted || isVoting}
            mode={mode}
            onSelect={() => setSelectedId(entry.submission.id)}
          />
        ))}
        <p className="bg-background absolute left-1/2 z-10 -translate-x-1/2 rounded-full border p-2 text-xs font-medium shadow-sm">
          vs.
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between transition-opacity duration-300 ease-out">
        <fieldset
          aria-hidden={!canVote}
          className={cn(
            "flex w-full flex-col gap-2 border-0 p-0",
            !canVote && "pointer-events-none opacity-0 select-none",
          )}
        >
          <legend className="leading-tight font-medium">
            What makes it shippable?
          </legend>
          <p className="text-muted-foreground text-xs">
            Select all that apply.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {feedbackReasons.map((reason) => {
              const selected = selectedReasons.has(reason);
              return (
                <button
                  key={reason}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleReason(reason)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent bg-transparent",
                  )}
                >
                  {reason}
                </button>
              );
            })}
          </div>
        </fieldset>

        {canVote && (
          <Button
            type="button"
            size="lg"
            className="flex items-center"
            onClick={submitVote}
          >
            {isVoting && <LoaderCircle className="animate-spin" />}
            {isVoting ? "Submitting..." : "Submit vote"}
          </Button>
        )}

        {voteSubmitted && (
          <Button
            type="button"
            size="lg"
            disabled={isLoadingNext}
            className="flex items-center"
            onClick={() =>
              startLoadingNext(() => {
                router.refresh();
              })
            }
          >
            {isLoadingNext ? (
              <>
                <LoaderCircle className="animate-spin" /> Loading...
              </>
            ) : (
              <>
                Next matchup <ChevronRight />
              </>
            )}
          </Button>
        )}
      </div>
    </main>
  );
}
