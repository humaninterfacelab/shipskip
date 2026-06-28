export type PreviewMode = "desktop" | "mobile";

const previewDimensions = {
  desktop: { width: "1440px", height: "810px", scale: 0.5 },
  mobile: { width: "430px", height: "932px", scale: 0.46 },
} as const;

export function Preview({
  src,
  title,
  mode,
}: {
  src: string;
  title: string;
  mode: PreviewMode;
}) {
  const { width, height, scale } = previewDimensions[mode];
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width,
          height,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <iframe
          className="h-full w-full"
          src={src}
          title={title}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    </div>
  );
}
