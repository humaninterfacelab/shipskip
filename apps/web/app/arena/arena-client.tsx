"use client";

import { ChevronRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { fetchRandomPair, vote } from "@/actions/arena";
import { FeedbackPanel, type Reason } from "@/components/feedback-panel";
import { Options } from "@/components/option-panel";
import { PreviewMode, PreviewToggle } from "@/components/preview-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Pair = NonNullable<Awaited<ReturnType<typeof fetchRandomPair>>>;

export function ArenaClient({ pair }: { pair: Pair }) {
  const [a, b] = pair;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<Set<Reason>>(
    new Set(),
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");

  const [isVoting, startVoting] = useTransition();
  const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false);

  const [isLoadingNext, startLoadingNext] = useTransition();

  const router = useRouter();

  const toggleReason = (reason: Reason) => {
    setSelectedReasons((prev) => {
      const updated = new Set(prev);

      if (updated.has(reason)) updated.delete(reason);
      else updated.add(reason);

      return updated;
    });
  };

  const submitVote = () => {
    if (!selectedOptionId || isVoting) return;

    const shipped = pair.find(
      ({ submission }) => submission.id === selectedOptionId,
    );

    const skipped = pair.find(
      ({ submission }) => submission.id !== selectedOptionId,
    );

    if (!shipped || !skipped) return;

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

  const loadNext = () => {
    startLoadingNext(async () => {
      router.refresh();
    });
  };

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] w-full flex-col justify-center gap-12 py-12">
      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg leading-tight font-medium">
            {a.task.title ?? b.task.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose the one you would ship.
          </p>
        </div>

        <PreviewToggle value={previewMode} onChange={setPreviewMode} />
      </div>

      <div className="relative flex items-center gap-4 p-px">
        <Options
          options={[
            {
              id: a.submission.id,
              model: a.submission.model,
              option: "a",
            },
            {
              id: b.submission.id,
              model: b.submission.model,
              option: "b",
            },
          ]}
          selectedOptionId={selectedOptionId}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          voteSubmitted={voteSubmitted || isVoting}
          revealModels={voteSubmitted}
          onSelect={setSelectedOptionId}
        />
        <p className="bg-background absolute left-1/2 z-10 -translate-x-1/2 rounded-full border p-2 text-xs font-medium shadow-sm">
          vs.
        </p>
      </div>

      <div
        className={cn(
          "flex items-end justify-between transition-opacity duration-300 ease-out",
        )}
      >
        <div
          aria-hidden={!selectedOptionId || voteSubmitted}
          className={cn(
            selectedOptionId && !voteSubmitted
              ? "opacity-100"
              : "pointer-events-none opacity-0 select-none",
          )}
        >
          <FeedbackPanel
            selectedReasons={selectedReasons}
            onToggleReason={toggleReason}
          />
        </div>

        {selectedOptionId && !voteSubmitted && (
          <Button
            size="lg"
            disabled={!selectedOptionId}
            className="hover:bg-primary/95 flex items-center transition-transform duration-300"
            onClick={submitVote}
          >
            {isVoting && <LoaderCircle className="animate-spin" />}
            {isVoting ? "Submitting..." : "Submit vote"}
          </Button>
        )}

        {voteSubmitted && (
          <Button
            size="lg"
            disabled={isLoadingNext}
            className="hover:bg-primary/95 flex items-center transition-transform duration-300"
            onClick={() => loadNext()}
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
