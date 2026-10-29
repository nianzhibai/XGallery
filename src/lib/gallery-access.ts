import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE = "xgallery-access";
export const ACCESS_MAX_AGE = 30 * 60;
export const TURNSTILE_ACTION = "gallery_access";

export function accessEnabled() {
  return process.env.GALLERY_ACCESS_ENABLED === "true";
}

export function accessConfig() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || "";
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim() || "";
  const sessionSecret = process.env.GALLERY_SESSION_SECRET || "";
  const hostnames = (process.env.TURNSTILE_HOSTNAMES || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  const isTestKey = /^[123]x00000000000000000000/.test(siteKey) || /^[123]x0000000000000000000000000000000/.test(secretKey);
  if (!siteKey || !secretKey || Buffer.byteLength(sessionSecret) < 32 || !hostnames.length || (process.env.NODE_ENV === "production" && isTestKey)) return null;
  return { siteKey, secretKey, sessionSecret, hostnames };
}

export function createAccessSession(secret: string, now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + ACCESS_MAX_AGE}.${randomBytes(16).toString("base64url")}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function validAccessSession(value: string | undefined, secret: string, now = Date.now()) {
  if (!value || value.length > 256) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !/^\d{1,12}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{22}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return false;
  const expires = Number(parts[0]);
  if (expires <= Math.floor(now / 1000) || expires > Math.floor(now / 1000) + ACCESS_MAX_AGE) return false;
  const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyTurnstile(token: unknown, config: NonNullable<ReturnType<typeof accessConfig>>) {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: config.secretKey, response: token }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true && result.action === TURNSTILE_ACTION && typeof result.hostname === "string" && config.hostnames.includes(result.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\x00-\x1f\x7f]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://xgallery.invalid");
    if (url.origin !== "https://xgallery.invalid" || url.pathname === "/verify" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}
