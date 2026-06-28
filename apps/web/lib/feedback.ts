export const feedbackReasons = [
  "Good colours",
  "Consistent design",
  "Mobile friendly",
  "Good content",
  "Good animations",
  "Accessible",
  "Easy to use",
] as const;

export type FeedbackReason = (typeof feedbackReasons)[number];
