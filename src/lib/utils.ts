import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Album } from "./types";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function imageUrl(id: string, version: string, download = false) {
  return `/api/media/${id}?original=1&v=${encodeURIComponent(version)}${download ? "&download=1" : ""}`;
}

export function thumbnailUrl(id: string, version: string) {
  return `/api/media/${id}/preview/${encodeURIComponent(version)}`;
}

/** The album title, prefixed with its model's name when it has one. */
export function albumLabel(album: Pick<Album, "title" | "model">) {
  return album.model ? `${album.model.name} · ${album.title}` : album.title;
}

/** Album, model and photo IDs produced by `stableId` during sync. */
export const isCatalogId = (value: string) => /^[a-f0-9]{24}$/.test(value);
