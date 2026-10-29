# Cloudflare 部署

XGallery 使用 Cloudflare + 橙云代理访问说明

## 基础接入

1. 在服务器上运行 XGallery，建议监听 `127.0.0.1`（默认监听 `0.0.0.0`），通过 Nginx 或 Caddy 反向代理，并转发原始 Host、HTTPS 协议和 `Accept` 请求头。
2. 在 Cloudflare DNS 中将域名指向服务器公网 IP，并开启橙云代理。
3. 为源站配置匹配域名的有效证书，并在 Cloudflare SSL/TLS 中使用 **Full (strict)**。

开启橙云后即可通过域名访问网站。Cloudflare 验证和图片缓存规则按需配置；仅开启橙云不会要求每位访客先完成验证。

## 访问验证（可选）

在 Cloudflare **Security → Security rules** 创建 Custom rule，匹配图库的精确域名，动作选择 **Managed Challenge**。规则需覆盖页面、图片和 API，不要只保护首页。Cloudflare 会根据请求展示自己的验证页，验证可能自动完成，也可能要求访客交互。

在 Challenge Passage 中设置验证有效期。建议设为 2 小时，以减少浏览期间的重复验证；Cloudflare 默认值为 30 分钟。此设置可能影响同一域名区域中的其他站点。有效期结束后，页面内的图片或点赞请求可能收到 HTML 验证页而失败；刷新页面后可重新验证。

如需防止绕过 Cloudflare 验证，应限制公网直接访问源站和 Next.js 端口，同时保留必要的管理访问。此验证用于减少自动化访问，不是账号认证。

## 图片缓存（可选）

Cloudflare 默认主要根据 URL 的文件扩展名判断缓存资格。项目的 `/_next/image` 和 `/api/media/` 地址没有图片扩展名，仅开启橙云时可能不会被 CDN 缓存，即使响应允许缓存；浏览器和 Next.js 自身仍可缓存。可在浏览器网络面板查看图片请求的 `CF-Cache-Status`：`DYNAMIC` 通常表示未进入 CDN 缓存，`HIT` 表示命中。

先检查图片的实际缓存情况；如需增加 CDN 缓存，可为 `/_next/image` 和 `/api/media/` 单独创建 **Eligible for cache** 规则。如果启用了访问验证，先确认 WAF 覆盖这些路径且无法绕过源站。不要对整个网站启用 Cache Everything，也不要共享缓存页面、点赞接口或带 `Set-Cookie` 的响应。

- 对 `/_next/image` 启用 Cache Rule 的 Vary 设置：`accept` 设为 `passthrough`，未明确处理的 Vary 字段设为 `bypass`。代理须转发 `Accept`，以区分不同图片格式。
- 缓存键保留完整查询字符串，包括优化图片的 `url`、`w`、`q` 和原图的 `original`、`download`。
- 原图 URL 不含版本，更新后可能在缓存有效期内仍显示旧图。清除 Cloudflare 缓存不会清除浏览器缓存。

## 部署后检查

- 确认域名可通过 HTTPS 访问，并检查封面、照片墙、原图、下载和点赞。
- 如配置了验证，在无痕窗口检查页面和图片直链是否受到挑战，以及验证过期后的行为；确认无法通过源站 IP 或 Next.js 端口绕过 Cloudflare。
- 如配置了图片缓存，重复请求相同图片并检查 `CF-Cache-Status`；分别测试不同图片、尺寸、格式和下载参数。首次 MISS 不代表配置错误。

官方文档：[Managed Challenge](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/)、[WAF 与缓存](https://developers.cloudflare.com/cache/interaction-cloudflare-products/waf-snippets/)、[缓存 Vary 设置](https://developers.cloudflare.com/cache/concepts/vary/)。
