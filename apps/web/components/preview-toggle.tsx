"use client";

import { Monitor, Smartphone } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export type PreviewMode = "desktop" | "mobile";

type PreviewToggleProps = {
  value: PreviewMode;
  onChange: (value: PreviewMode) => void;
};

export function PreviewToggle({ value, onChange }: PreviewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      defaultValue="desktop"
      onValueChange={(val: string) => {
        if (val === "desktop" || val === "mobile") {
          onChange(val);
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
