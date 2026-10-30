# Docker 部署

镜像 `ghcr.io/nianzhibai/xgallery` 支持 Linux `amd64` 和 `arm64`

`latest` 是默认稳定版，`main` 是主分支构建，也可使用 `v1.0.0` 等标签固定版本

## 部署

下载 `compose.yaml`

```bash
curl -fLO https://raw.githubusercontent.com/nianzhibai/XGallery/main/compose.yaml
```

编辑 `compose.yaml`，将 `./albums:/albums:ro` 中的 `./albums` 改为已有图集目录的绝对路径，例如 `/root/albums:/albums:ro`。`compose.yaml` 中还有一些配置，按需调整

启动容器并建立图集索引

```bash
docker compose up -d
docker compose exec xgallery npm run albums:sync
```

同步完成后，访问 `http://服务器IP:3000`。如使用反向代理，建议将端口映射改为 `127.0.0.1:3000:3000`

## 更新图集

添加、删除或替换照片后，可以再次运行：

```bash
docker compose exec xgallery npm run albums:sync
```

也可以开启定时自动同步，将 `compose.yaml` 中的 `ALBUMS_SYNC_ENABLED` 设为 `"true"`，并按需设置 `ALBUMS_SYNC_TIMEZONE` 和 `ALBUMS_SYNC_TIME`，然后运行 `docker compose up -d`

## 更新镜像

```bash
docker compose pull
docker compose up -d
```
