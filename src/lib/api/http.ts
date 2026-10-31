import { createHash, timingSafeEqual } from "node:crypto";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function authorize(request: Request): Response | null {
  if (process.env.API_ENABLED !== "true") return json({ error: { code: "api_disabled", message: "API 未启用" } }, 503);
  const keys = (process.env.API_KEYS ?? "").split(",").map((key) => key.trim()).filter(Boolean);
  if (!keys.length) return json({ error: { code: "api_unavailable", message: "API 密钥未配置" } }, 503);
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  const digest = (value: string) => createHash("sha256").update(value).digest();
  const supplied = digest(match?.[1] ?? "");
  let valid = 0;
  for (const key of keys) valid |= Number(timingSafeEqual(supplied, digest(key)));
  if (!match || !valid) {
    return Response.json({ error: { code: "unauthorized", message: "API 密钥无效或未提供" } }, {
      status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" },
    });
  }
  return null;
}

export function pagination(params: URLSearchParams) {
  const parse = (name: string, fallback: number) => {
    const value = params.get(name);
    if (value === null) return fallback;
    if (!/^[1-9]\d*$/.test(value)) return NaN;
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : NaN;
  };
  const page = parse("page", 1);
  const limit = parse("limit", 20);
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(limit) || limit > 100 || !Number.isSafeInteger(offset)) return null;
  return { page, limit, offset };
}

export function paginated<T>(data: T[], page: number, limit: number, total: number) {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export const badRequest = (message: string) => json({ error: { code: "bad_request", message } }, 400);
export const notFound = (message: string) => json({ error: { code: "not_found", message } }, 404);
