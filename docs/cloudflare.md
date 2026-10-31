# Cloudflare 部署

## 基础接入

1. 在服务器上运行 XGallery，建议通过 Nginx 或 Caddy 反向代理，转发原始 Host、HTTPS 协议和 `Accept` 请求头；将应用端口限制在本机。
2. 在 Cloudflare DNS 中将域名指向服务器并开启橙云，为源站配置有效证书，SSL/TLS 模式选择 **Full (strict)**。
3. 如果只想用户通过 Cloudflare 访问网站，反代层应该限制来源地址。

## 访问验证（建议配置）

在 **Security → Security rules** 为图库域名创建 **Managed Challenge** 规则，覆盖页面、网站图片和点赞接口。启用 API 调用时，排除 `/api/v1/`，例如：

```text
(http.host eq "gallery.example.com") and
not starts_with(http.request.uri.path, "/api/v1/")
```

Challenge Passage 建议设为 2 小时；此设置可能影响同一域名区域中的其他站点。验证过期后，如果图片或点赞请求失败，刷新页面可重新验证。

Cloudflare 的 Browser Integrity Check 也可能拦截 Python 等 API 客户端。可通过 Configuration Rule 仅对图库域名的 `/api/v1/` 路径关闭该检查；API 仍由密钥验证保护。

## 图片缓存（建议配置）

建议为 `/_next/image` 和 `/api/media/` 创建 **Eligible for cache** 规则，并确保验证覆盖这些路径。对 `/_next/image` 的 Vary 设置中将 `accept` 设为 `passthrough`，未明确处理的字段设为 `bypass`；缓存键保留完整查询字符串。

不要共享缓存页面、点赞接口或带 `Set-Cookie` 的响应，也不要覆盖 `/api/v1/` 的 `no-store` 响应。图片默认缓存 7 天

## 检查

- 检查 HTTPS、页面图片、原图下载和点赞；启用验证时，也检查图片直链和源站是否受保护。
- 启用 API 时，携带密钥测试目录和图片接口。响应头 `cf-mitigated: challenge` 表示请求遇到 Cloudflare 验证。
- 启用图片缓存时，重复请求并检查 `CF-Cache-Status`；首次 `MISS` 不代表配置错误。

参考：[Managed Challenge](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/)、[WAF 与缓存](https://developers.cloudflare.com/cache/interaction-cloudflare-products/waf-snippets/)、[缓存 Vary 设置](https://developers.cloudflare.com/cache/concepts/vary/)
