import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPreviewUrl(id: string) {
  return `https://${id}.shipskip.pages.dev/`;
}
