import { randomPhoto } from "@/lib/api/catalog";
import { authorize, json, notFound } from "@/lib/api/http";

export function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const photo = randomPhoto();
  return photo ? json({ data: photo }) : notFound("图库中没有照片");
}
