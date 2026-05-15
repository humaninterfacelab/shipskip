"use client";

import { Monitor, Smartphone } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export type ViewMode = "desktop" | "mobile";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(nextView) => {
        if (nextView === "desktop" || nextView === "mobile") {
          onChange(nextView);
        }
      }}
    >
      <ToggleGroupItem value="desktop" className="cursor-pointer">
        <Monitor />
        Desktop
      </ToggleGroupItem>
      <ToggleGroupItem value="mobile" className="cursor-pointer">
        <Smartphone />
        Mobile
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
