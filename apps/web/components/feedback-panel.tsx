"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { badgeVariants } from "./ui/badge";
import { Button } from "./ui/button";

type FeedbackPanelProps = {
  title?: string;
  description?: string;
};

const reasons = [
  "Good Colors",
  "Consistent Design",
  "Mobile Friendly",
  "Good Content",
  "Good Animations",
  "Accessible",
  "Easy to Use",
] as const;

type Reason = (typeof reasons)[number];

export function FeedbackPanel({ title, description }: FeedbackPanelProps) {
  const [selectedReasons, setSelectedReasons] = useState<Set<Reason>>(
    new Set(),
  );

  const toggleReason = (reason: Reason) => {
    setSelectedReasons((prev) => {
      const updated = new Set(prev);

      if (updated.has(reason)) {
        updated.delete(reason);
      } else {
        updated.add(reason);
      }

      return updated;
    });
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="leading-tight font-medium">
        {title ?? "Why would you ship this option?"}
      </p>

      <p className="text-muted-foreground text-xs">
        {description ?? "Select all that apply."}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {reasons.map((reason) => {
          const selected = selectedReasons.has(reason);

          return (
            <Button
              key={reason}
              aria-pressed={selected}
              onClick={() => toggleReason(reason)}
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
