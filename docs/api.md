# API 调用

- API 调用默认关闭
- 源码部署：写入项目根目录的 `.env.local`，重启应用
- Docker Compose：在 `compose.yaml` 的 `environment` 中配置，重新创建容器
- 添加或移除密钥后需重启应用或重新创建容器
- `API_ENABLED=true`，但 `API_KEYS` 为空，API 不会开放访问

## 调用示例

```bash
curl 'https://example.com/api/v1/albums?page=1&limit=20' \
  -H 'Authorization: Bearer 你的密钥'
```

## 接口

| GET 路径 | 说明 |
| --- | --- |
| `/api/v1/models` | 模特列表 |
| `/api/v1/albums` | 图集列表、筛选及搜索 |
| `/api/v1/albums/{albumId}` | 图集详情 |
| `/api/v1/albums/{albumId}/photos` | 图集照片列表 |
| `/api/v1/photos/random` | 随机获取一张照片 |
| `/api/v1/photos/{photoId}?v={version}` | 获取原图（可加 `download=1` 下载） |

列表支持 `page`（从 1 开始，默认 1）和 `limit`（默认 20，最大 100）。返回 `data` 数组及 `pagination`（`page`、`limit`、`total`、`totalPages`）；空列表的 `totalPages` 为 0。详情返回 `{ "data": { ... } }`。

图集列表还支持 `modelId` 筛选、`q` 搜索模特名和图集名，以及 `sort` 排序：`updated`（默认）、`title` 或 `popular`。搜索最多 100 个字符，空格分隔的词都必须匹配；ASCII 字母不区分大小写。

- 模特字段：`id`、`name`、`albumCount`、`photoCount`、`coverUrl`。
- 图集字段：`id`、`title`、`model`、`photoCount`、`totalBytes`、`likeCount`、`coverUrl`、`updatedAt`（UTC）。
- 照片字段：`id`、`filename`、`width`、`height`、`position`（从 0 开始）、`imageUrl`。

随机照片返回 `{ "data": { ... } }`，字段与照片列表相同，另包含所属图集的 `albumId`、模特的 `modelId` 和 `modelName`；图库为空时返回 404。每次请求从全部照片中随机选择一张，结果可能重复。

`coverUrl` 和 `imageUrl` 是站内相对路径，请补上图库域名并携带 API key 请求；返回内容是原图。图片更改并同步后需重新获取地址；移动或重命名文件会改变资源 ID。

API 响应禁止缓存，不要在代理或 CDN 覆盖此设置。参数无效返回 400，密钥缺失或错误返回 401，资源不存在或图片版本过期返回 404，API 关闭或未配置密钥时返回 503。目录接口和认证错误返回 `{ "error": { "code": "...", "message": "..." } }`；图片不存在或版本过期时返回文本。