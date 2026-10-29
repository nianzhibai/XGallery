import { test } from "node:test";
import assert from "node:assert/strict";
import { accessConfig, createAccessSession, safeReturnPath, validAccessSession, verifyTurnstile } from "../src/lib/gallery-access";

const secret = "a".repeat(40);

test("访问会话校验签名和过期时间", () => {
  const now = 1_800_000_000_000;
  const session = createAccessSession(secret, now);
  assert.equal(validAccessSession(session, secret, now), true);
  assert.equal(validAccessSession(session, "b".repeat(40), now), false);
  assert.equal(validAccessSession(session + "x", secret, now), false);
  assert.equal(validAccessSession(session, secret, now + 30 * 60_000), false);
});

test("验证后的返回地址只能是站内页面", () => {
  assert.equal(safeReturnPath("/album/123?x=1"), "/album/123?x=1");
  for (const value of ["//example.com", "/\\example.com", "https://example.com", "/verify", "/api/media/a"]) assert.equal(safeReturnPath(value), "/");
});

test("Turnstile 要求成功、正确 action 和域名，并在网络错误时拒绝", async () => {
  const originalFetch = globalThis.fetch;
  const config = { siteKey: "site", secretKey: "secret", sessionSecret: secret, hostnames: ["gallery.example.com"] };
  const response = (body: object) => async () => Response.json(body);
  try {
    globalThis.fetch = response({ success: true, action: "gallery_access", hostname: "gallery.example.com" }) as typeof fetch;
    assert.equal(await verifyTurnstile("token", config), true);
    globalThis.fetch = response({ success: true, action: "other", hostname: "gallery.example.com" }) as typeof fetch;
    assert.equal(await verifyTurnstile("token", config), false);
    globalThis.fetch = response({ success: true, action: "gallery_access", hostname: "evil.example.com" }) as typeof fetch;
    assert.equal(await verifyTurnstile("token", config), false);
    assert.equal(await verifyTurnstile("x".repeat(2049), config), false);
    globalThis.fetch = (async () => { throw new Error("unavailable"); }) as typeof fetch;
    assert.equal(await verifyTurnstile("token", config), false);
  } finally { globalThis.fetch = originalFetch; }
});

test("配置不完整时不放行", () => {
  const oldSecret = process.env.GALLERY_SESSION_SECRET;
  try { process.env.GALLERY_SESSION_SECRET = "short"; assert.equal(accessConfig(), null); }
  finally { if (oldSecret === undefined) delete process.env.GALLERY_SESSION_SECRET; else process.env.GALLERY_SESSION_SECRET = oldSecret; }
});

test("验证接口签发页面会话，媒体和图片优化器交由 Cloudflare 保护", async () => {
  const { POST } = await import("../src/app/api/verify/route");
  const { proxy } = await import("../src/proxy");
  const { NextRequest } = await import("next/server");
  const settings: Record<string, string> = { GALLERY_ACCESS_ENABLED: "true", TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "secret-key", TURNSTILE_HOSTNAMES: "gallery.example.com", GALLERY_SESSION_SECRET: secret };
  const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, settings);
  try {
    assert.equal(proxy(new NextRequest("https://gallery.example.com/album/123")).status, 307);
    assert.equal(proxy(new NextRequest("https://gallery.example.com/api/media/123")).status, 200);
    assert.equal(proxy(new NextRequest("https://gallery.example.com/_next/image?url=x")).status, 200);
    assert.equal(proxy(new NextRequest("https://gallery.example.com/api/verify", { method: "POST" })).status, 200);
    globalThis.fetch = (async () => Response.json({ success: true, action: "gallery_access", hostname: "gallery.example.com" })) as typeof fetch;
    const request = (origin: string) => new Request("https://gallery.example.com/api/verify", { method: "POST", headers: { host: "gallery.example.com", origin, "content-type": "application/json" }, body: JSON.stringify({ token: "token" }) });
    assert.equal((await POST(request("https://evil.example.com"))).status, 403);
    const response = await POST(request("https://gallery.example.com"));
    assert.equal(response.status, 200);
    const cookie = response.cookies.get("xgallery-access");
    assert.ok(cookie);
    assert.equal(cookie.httpOnly, true);
    assert.equal(proxy(new NextRequest("https://gallery.example.com/album/123", { headers: { cookie: `xgallery-access=${cookie.value}` } })).status, 200);
    assert.equal(proxy(new NextRequest("https://gallery.example.com/album/123", { headers: { cookie: `xgallery-access=${cookie.value}broken` } })).status, 307);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
