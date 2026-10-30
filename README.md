<p align="center"><img src="src/app/icon.svg" alt="XGallery 图标" width="64" height="64"></p>

<h1 align="center">XGallery</h1>

XGallery 是一个简约优雅的多模特图集网站，提供丝滑、沉浸的照片浏览体验

项目基于 Next.js 和 TypeScript，使用 Tailwind CSS、shadcn/ui 和 Motion 构建界面与动画，采用 SQLite 和 Drizzle 管理数据，并通过 PhotoSwipe 提供大图浏览体验

页面仿照 [栖光集](https://xrw-album.christin3.com/)

## 图集目录要求

```text
Albums/                       # ALBUMS_DIR
├── 模特 A/
│   ├── 图集一/
│   │   ├── 01.jpg
│   │   ├── 02.jpg
│   │   └── 03.png
│   └── 图集二/
│       ├── 01.webp
│       └── 02.jpg
└── 模特 B/
    ├── 01.jpg
    └── 02.jpg
```

## Docker 部署

下载 `compose.yaml`

```bash
curl -fLO https://raw.githubusercontent.com/nianzhibai/XGallery/main/compose.yaml
```

编辑 `compose.yaml`，将 `./albums:/albums:ro` 中的 `./albums` 改为已有图集目录的绝对路径。启动容器并建立图集索引

```bash
docker compose up -d
docker compose exec xgallery npm run albums:sync
```

同步完成后，访问 `http://服务器IP:3000`，更多配置见 [Docker 部署说明](docs/docker.md)

## 源码部署

需要 Node.js >= 22.12.0 以及 npm，克隆项目并安装依赖

```bash
git clone https://github.com/nianzhibai/XGallery.git
cd XGallery
npm ci
cp .env.example .env.local
```

编辑 `.env.local` 配置参数，然后建立图集索引、构建并启动：

```bash
npm run albums:sync
npm run build
npm start
```

访问 `http://服务器IP:3000`

## Cloudflare 配置

[Cloudflare 配置说明](docs/cloudflare.md)

## 使用须知

请遵守法律法规
