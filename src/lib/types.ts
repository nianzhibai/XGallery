export type Album = {
  id: string;
  title: string;
  modelId: string;
  modelName: string;
  coverId: string;
  coverVersion: string;
  photoCount: number;
  totalBytes: number;
  updatedAt: number;
  likes: number;
};

export type Model = {
  id: string;
  name: string;
  albumCount: number;
  photoCount: number;
  likeCount: number;
  coverId: string;
  coverVersion: string;
};

export type ModelSuggestion = Pick<Model, "id" | "name" | "albumCount">;

export type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  position: number;
  version: string;
};

export type AlbumSort = "updated" | "title" | "popular";

export type HomeSection = "recent" | "random";

export type LibraryState = {
  favorites: string[];
  recent: string[];
  liked: string[];
};
