import { countAlbums, findAlbums, randomAlbums, type AlbumPool } from "./catalog";
import type { HomeSection } from "./types";

const sections: Record<HomeSection, { count: number; pool: AlbumPool }> = {
  recent: { count: 8, pool: "recent" },
  random: { count: 16, pool: "all" },
};

export const isHomeSection = (value: string): value is HomeSection => Object.hasOwn(sections, value);

/** A batch of albums for a home section, preferring albums not in `exclude`. */
export function homeBatch(section: HomeSection, exclude: string[] = []) {
  return randomAlbums({ ...sections[section], exclude });
}

/**
 * Refreshes a batch saved earlier in the session. It is kept only while it is still a
 * valid batch for the current catalog: every album exists, belongs to the section's
 * pool, and the batch is full. Otherwise the section gets a new batch.
 */
export function restoreHomeBatch(section: HomeSection, ids: string[]) {
  const { count, pool } = sections[section];
  const albums = findAlbums(ids, pool);
  const valid = albums.length === ids.length && ids.length === Math.min(count, countAlbums(pool));
  return valid ? albums : homeBatch(section);
}
