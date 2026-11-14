-- Albums inside the reserved unassigned directory have no model.
CREATE TABLE albums_new (
  id TEXT PRIMARY KEY NOT NULL,
  model_id TEXT REFERENCES models(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  relative_path TEXT NOT NULL UNIQUE,
  cover_id TEXT NOT NULL,
  photo_count INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);
INSERT INTO albums_new SELECT id, model_id, title, relative_path, cover_id, photo_count, total_bytes, updated_at, seen_at FROM albums;
DROP TABLE albums;
ALTER TABLE albums_new RENAME TO albums;
CREATE INDEX albums_model_idx ON albums(model_id);
