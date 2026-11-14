"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Album } from "@/lib/types";

const lookupLimit = 1000;

// Albums resolved during this browsing session. null marks an ID that no longer exists.
type AlbumCache = ReadonlyMap<string, Album | null>;
const AlbumCacheContext = createContext<{
  albums: AlbumCache;
  remember: (entries: Iterable<[string, Album | null]>) => void;
} | null>(null);

export function AlbumCacheProvider({ children }: { children: React.ReactNode }) {
  const [albums, setAlbums] = useState<AlbumCache>(() => new Map());
  const remember = useCallback((entries: Iterable<[string, Album | null]>) => {
    setAlbums((current) => new Map([...current, ...entries]));
  }, []);
  const value = useMemo(() => ({ albums, remember }), [albums, remember]);
  return <AlbumCacheContext.Provider value={value}>{children}</AlbumCacheContext.Provider>;
}

/** Fetches the albums that still exist, in the order of `ids`. */
async function fetchAlbums(ids: string[], signal?: AbortSignal) {
  const response = await fetch("/api/albums/lookup", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }), signal,
  });
  if (!response.ok) throw new Error("图集读取失败");
  return (await response.json() as { data: Album[] }).data;
}

function useAlbumCache() {
  const cache = useContext(AlbumCacheContext);
  if (!cache) throw new Error("useAlbumCache must be used within AlbumCacheProvider");
  return cache;
}

/** Makes an album the page already has available to later lookups without a request. */
export function useRememberAlbum(album: Album) {
  const { remember } = useAlbumCache();
  useEffect(() => { remember([[album.id, album]]); }, [album, remember]);
}

/**
 * Loads albums by ID in the given order. Cached albums render immediately, which keeps
 * scroll restoration intact, and are revalidated once per mount so sync changes show up.
 */
export function useAlbumLookup(ids: string[], enabled: boolean) {
  const { albums, remember } = useAlbumCache();
  const [validated, setValidated] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState(false);
  const requestKey = ids.filter((id) => !validated.has(id)).slice(0, lookupLimit).join(",");

  useEffect(() => {
    if (!enabled || !requestKey) return;
    const requested = requestKey.split(",");
    const controller = new AbortController();
    fetchAlbums(requested, controller.signal)
      .then((data) => {
        const found = new Map(data.map((album) => [album.id, album]));
        setFailed(false);
        remember(requested.map((id) => [id, found.get(id) ?? null]));
        setValidated((current) => new Set([...current, ...requested]));
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [enabled, requestKey, remember]);

  return {
    albums: ids.flatMap((id) => albums.get(id) ?? []),
    loaded: enabled && ids.every((id) => albums.has(id)),
    failed,
  };
}
