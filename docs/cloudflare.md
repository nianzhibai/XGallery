# Cloudflare 验证与缓存

XGallery 的验证默认关闭。启用后，应用通过 Turnstile 和 Siteverify 保护页面；图片和 API 的访问检查由 Cloudflare WAF 负责。**未配置 WAF 或源站可以直接访问时，图片和 API 仍可被直接访问。** 此功能用于减少自动化访问，不是账号认证。

## 配置

1. 将域名接入 Cloudflare 并开启橙云，或使用 Cloudflare Tunnel。使用反向代理时，保留原始 Host 和 HTTPS 协议信息；源站配置有效证书后使用 Full (strict)。限制公网直连源站和 Next.js 端口，避免绕过 Cloudflare。
2. 创建 Managed 模式的 Turnstile widget，添加生产域名，并开启 **Pre-clearance → Managed**。生产环境使用真实密钥和独立 widget。
3. 在部署环境中填写 [.env.example](../.env.example) 的验证配置，暂时保持 `GALLERY_ACCESS_ENABLED=false`。`TURNSTILE_HOSTNAMES` 填精确主机名，不含协议和端口，多个用逗号分隔。`GALLERY_SESSION_SECRET` 至少 32 字节，可用以下命令生成；多实例须使用相同密钥。Secret key 和会话密钥不能提交到版本库。

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

4. 在 Cloudflare **Security → Security rules** 创建 Custom rule，匹配图库的精确域名及下列路径，动作选择 **Managed Challenge**：

   - `/_next/image`：Next.js 图片优化器
   - `/api/media/` 前缀：原图和预览图
   - `/api/albums/` 前缀：点赞接口

   验证页 `/verify`、验证接口 `/api/verify`、其他页面及 `/_next/static/` 不应被这条规则挑战，否则自定义验证流程可能无法运行。直接访问图片时，未验证访客可能看到 Cloudflare 自带验证页。

5. 将 Cloudflare Challenge Passage 设为 30 分钟，与应用页面会话的有效期接近。两个凭证独立管理，可能提前或分别失效；看图或点赞遇到验证时，可刷新页面重新验证。
6. 完成上述配置后，将 `GALLERY_ACCESS_ENABLED` 设为 `true` 并重启应用。

生产环境需要 HTTPS；浏览器须能加载 Turnstile 脚本，服务端须能访问 `https://challenges.cloudflare.com/turnstile/v0/siteverify`。启用验证但配置不完整时，页面不会放行。

## 图片缓存

确认 WAF 生效且无法绕过源站后，可为 `/_next/image` 和 `/api/media/` 单独创建 **Eligible for cache** 规则。不要对整个网站启用 Cache Everything，也不要共享缓存页面、点赞接口或带 `Set-Cookie` 的响应。

- 对 `/_next/image` 启用 Cache Rule 的 Vary 设置：`accept` 设为 `passthrough`，未明确处理的 Vary 字段设为 `bypass`。代理须转发 `Accept`，以区分不同图片格式。
- 缓存键保留完整查询字符串，包括优化图片的 `url`、`w`、`q` 和原图的 `original`、`download`。
- 原图 URL 不含版本，更新后可能在缓存有效期内仍显示旧图。清除 Cloudflare 缓存不会清除浏览器缓存。

## 部署后检查

- 无痕访问页面应显示 XGallery 验证页；直接请求图片和 `/_next/image` 应受到 Cloudflare 挑战。
- 验证后检查封面、照片墙、原图、下载和点赞；过期后检查重新验证。
- 重复请求相同图片，检查 `CF-Cache-Status`；分别测试不同图片、尺寸、格式和下载参数。首次 MISS 不代表配置错误。
- 确认无法通过源站 IP 或 Next.js 端口绕过 Cloudflare。

上述 Cloudflare 规则尚未在实际部署中验证。官方文档：[Pre-clearance](https://developers.cloudflare.com/cloudflare-challenges/concepts/clearance/)、[WAF 与缓存](https://developers.cloudflare.com/cache/interaction-cloudflare-products/waf-snippets/)、[缓存 Vary 设置](https://developers.cloudflare.com/cache/concepts/vary/)。
