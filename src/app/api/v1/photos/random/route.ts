import { randomPhoto } from "@/lib/catalog";
import { photoResource } from "@/lib/api/resources";
import { authorize, json, notFound } from "@/lib/api/http";

export function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const photo = randomPhoto();
  if (!photo) return notFound("图库中没有照片");
  return json({ data: { ...photoResource(photo), albumId: photo.albumId, modelId: photo.model?.id ?? null, modelName: photo.model?.name ?? null } });
}
