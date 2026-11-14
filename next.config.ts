import type { NextConfig } from "next";

// Hostnames besides localhost that may load the dev server, such as a LAN or remote server address.
const devOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", ...devOrigins],
  serverExternalPackages: ["better-sqlite3", "sharp"],
  images: { minimumCacheTTL: 0, localPatterns: [{ pathname: "/api/media/*/preview/*", search: "" }] },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
    ] }];
  },
};
export default nextConfig;
