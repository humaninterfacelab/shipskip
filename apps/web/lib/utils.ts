import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPreviewUrl(id: string) {
  const domain = process.env.NEXT_PUBLIC_PAGES_DOMAIN ?? "shipskip.pages.dev";
  return `https://${id}.${domain}/`;
}
