import { cn } from "@/lib/utils";

import { PreviewMode } from "./preview-toggle";

type PreviewProps = {
  src: string;
  title: string;
  previewMode: PreviewMode;
  isMaximised: boolean;
  className?: string;
  frameClassName?: string;
};

export function Preview({
  src,
  title,
  previewMode,
  isMaximised,
  className,
  frameClassName,
}: PreviewProps) {
  let width = "1440px";
  let height = "810px";

  if (previewMode === "mobile") {
    width = "430px";
    height = "932px";
  }

  let scale = isMaximised ? 1 : 0.5;
  if (previewMode === "mobile") {
    scale = isMaximised ? 0.8 : 0.46;
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-transparent",
        className,
      )}
    >
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: width,
          height: height,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <iframe
          className={cn("h-full w-full", frameClassName)}
          src={src}
          title={title}
        />
      </div>
    </div>
  );
}
