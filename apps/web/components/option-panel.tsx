import { Check, Expand, ExternalLink, Shrink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ViewMode, ViewToggle } from "./view-toggle";

type OptionPanelType = {
  src: string;
  option: "a" | "b";
  isSelected: boolean;
  viewMode: ViewMode;
  onSelect: (value: "a" | "b") => void;
  setViewMode: (value: ViewMode) => void;
};

export function OptionPanel({
  src,
  option,
  isSelected,
  viewMode,
  onSelect,
  setViewMode,
}: OptionPanelType) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      <Card
        className={cn(
          "flex h-full w-full flex-col overflow-hidden transition-colors duration-200",
          isSelected && "border-primary bg-primary/5 ring-primary/40 ring-2",
          isFullscreen && "rounded-none border-none",
        )}
      >
        <CardHeader
          onClick={() => {
            if (!isFullscreen) onSelect(option);
          }}
          className={cn(
            "flex items-center justify-between",
            !isFullscreen && "cursor-pointer",
          )}
        >
          <CardTitle>{`Option ${option.toUpperCase()}`}</CardTitle>

          <div className="flex items-center gap-2">
            {isFullscreen && (
              <ViewToggle value={viewMode} onChange={setViewMode} />
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                toggleFullscreen();
              }}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Shrink className="h-4 w-4" />
              ) : (
                <Expand className="h-4 w-4" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              asChild
              onClick={(event) => event.stopPropagation()}
            >
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open option ${option} preview in a new tab`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex aspect-16/11 flex-1 items-center justify-center overflow-hidden">
          <iframe
            className={cn(
              "h-full rounded-lg border transition-[width] duration-300 ease-in-out",
              isFullscreen && "rounded-none border-none",
              viewMode === "desktop"
                ? "w-full"
                : isFullscreen
                  ? "max-h-[80%] w-1/5"
                  : "w-2/5",
            )}
            src={src}
            title={`Option ${option.toUpperCase()}`}
          />
        </CardContent>

        {!isFullscreen && (
          <CardFooter className="flex justify-center border-t p-0">
            <Button
              variant={isSelected ? "default" : "ghost"}
              className="w-full rounded-t-none rounded-b-xl py-6"
              onClick={() => onSelect(option)}
              aria-pressed={isSelected}
              size="lg"
            >
              {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
              {`Ship option ${option.toUpperCase()}`}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
