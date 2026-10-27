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
  coverId: string;
};

export type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  position: number;
  version: string;
};

export type LibraryState = {
  favorites: string[];
  recent: string[];
  liked: string[];
};
