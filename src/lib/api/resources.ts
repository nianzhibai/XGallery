import type { Album, Model, Photo } from "../types";

// Public API representations of catalog records.

function photoUrl(id: string, version: string) {
  return `/api/v1/photos/${id}?v=${encodeURIComponent(version)}`;
}

export function photoResource(photo: Photo) {
  return { id: photo.id, filename: photo.filename, width: photo.width, height: photo.height,
    position: photo.position, imageUrl: photoUrl(photo.id, photo.version) };
}

export function albumResource(album: Album) {
  return { id: album.id, title: album.title, model: { id: album.modelId, name: album.modelName },
    photoCount: album.photoCount, totalBytes: album.totalBytes, likeCount: album.likes,
    coverUrl: photoUrl(album.coverId, album.coverVersion), updatedAt: new Date(album.updatedAt).toISOString() };
}

export function modelResource(model: Model) {
  return { id: model.id, name: model.name, albumCount: model.albumCount, photoCount: model.photoCount,
    coverUrl: photoUrl(model.coverId, model.coverVersion) };
}
