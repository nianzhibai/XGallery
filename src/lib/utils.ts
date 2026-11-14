import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function imageUrl(id: string, version: string, download = false) {
  return `/api/media/${id}?original=1&v=${encodeURIComponent(version)}${download ? "&download=1" : ""}`;
}

export function thumbnailUrl(id: string, version: string) {
  return `/api/media/${id}/preview/${encodeURIComponent(version)}`;
}

/** Album, model and photo IDs produced by `stableId` during sync. */
export const isCatalogId = (value: string) => /^[a-f0-9]{24}$/.test(value);
