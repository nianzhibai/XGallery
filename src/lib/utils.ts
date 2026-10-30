import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function imageUrl(id: string, version: string, download = false) {
  return `/api/media/${id}?original=1&v=${encodeURIComponent(version)}${download ? "&download=1" : ""}`;
}

export function thumbnailUrl(id: string, version: string) {
  return `/api/media/${id}/preview/${encodeURIComponent(version)}`;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
