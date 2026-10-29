import { integer, sqliteTable, text, index, primaryKey } from "drizzle-orm/sqlite-core";

export const models = sqliteTable("models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  seenAt: integer("seen_at").notNull(),
});

export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  modelId: text("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  relativePath: text("relative_path").notNull().unique(),
  coverId: text("cover_id").notNull(),
  photoCount: integer("photo_count").notNull(),
  totalBytes: integer("total_bytes").notNull(),
  updatedAt: integer("updated_at").notNull(),
  seenAt: integer("seen_at").notNull(),
}, (table) => [index("albums_model_idx").on(table.modelId)]);

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  albumId: text("album_id").notNull().references(() => albums.id, { onDelete: "cascade" }),
  relativePath: text("relative_path").notNull().unique(),
  filename: text("filename").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  modifiedAt: integer("modified_at").notNull(),
  position: integer("position").notNull(),
  seenAt: integer("seen_at").notNull(),
}, (table) => [index("photos_album_idx").on(table.albumId, table.position)]);

export const imageMetadataCache = sqliteTable("image_metadata_cache", {
  id: text("id").primaryKey(),
  bytes: integer("bytes").notNull(),
  modifiedAt: integer("modified_at").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  animated: integer("animated").notNull(),
  seenAt: integer("seen_at").notNull(),
});

export const likes = sqliteTable("likes", {
  albumId: text("album_id").notNull().references(() => albums.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.albumId, table.visitorId] })]);
