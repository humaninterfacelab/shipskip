import { getPreviewUrl } from "@/lib/utils";

import { OptionCard } from "./option-card";
import { PreviewMode } from "./preview-toggle";

type Option = {
  id: string;
  model: string;
  option: "a" | "b";
};

type OptionsProps = {
  options: [Option, Option];
  selectedOptionId: string | null;
  voteSubmitted: boolean;
  revealModels: boolean;
  previewMode: PreviewMode;
  onSelect: (id: string) => void;
  setPreviewMode: (value: PreviewMode) => void;
};

export function Options({
  options,
  selectedOptionId,
  previewMode,
  voteSubmitted,
  revealModels,
  onSelect,
  setPreviewMode,
}: OptionsProps) {
  return options.map((option) => (
    <OptionCard
      key={option.id}
      src={getPreviewUrl(option.id)}
      option={option.option}
      previewMode={previewMode}
      setPreviewMode={setPreviewMode}
      onSelect={() => onSelect(option.id)}
      isSelected={selectedOptionId === option.id}
      voteSubmitted={voteSubmitted}
      model={revealModels ? option.model : null}
    />
  ));
}
