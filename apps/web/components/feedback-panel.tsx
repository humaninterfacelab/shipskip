import { cn } from "@/lib/utils";

import { badgeVariants } from "./ui/badge";
import { Button } from "./ui/button";

type FeedbackPanelProps = {
  title?: string;
  description?: string;
  selectedReasons: Set<Reason>;
  onToggleReason: (reason: Reason) => void;
};

export const feedbackReasons = [
  "Good colours",
  "Consistent design",
  "Mobile friendly",
  "Good content",
  "Good animations",
  "Accessible",
  "Easy to use",
] as const;

export type Reason = (typeof feedbackReasons)[number];

export function FeedbackPanel({
  title,
  description,
  selectedReasons,
  onToggleReason,
}: FeedbackPanelProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="leading-tight font-medium">
        {title ?? "What makes it shippable?"}
      </p>

      <p className="text-muted-foreground text-xs">
        {description ?? "Select all that apply."}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {feedbackReasons.map((reason) => {
          const selected = selectedReasons.has(reason);

          return (
            <Button
              key={reason}
              aria-pressed={selected}
              onClick={() => onToggleReason(reason)}
              className={cn(
                badgeVariants({ variant: "outline" }),
                "hover:bg-accent cursor-pointer bg-transparent px-2 py-3 transition-colors duration-200",
                selected &&
                  "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {reason}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
