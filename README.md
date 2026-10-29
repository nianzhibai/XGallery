<p align="center"><img src="src/app/icon.svg" alt="XGallery 图标" width="64" height="64"></p>

<h1 align="center">XGallery</h1>

XGallery 是一个简约优雅的多模特图集网站，专注于提供丝滑、沉浸的照片浏览体验

项目基于 Next.js 和 TypeScript，使用 Tailwind CSS、shadcn/ui 和 Motion 构建界面与动画，采用 SQLite 和 Drizzle 管理数据，并通过 PhotoSwipe 提供大图浏览体验

页面仿照 [栖光集](https://xrw-album.christin3.com/) 设计

## 图集目录结构要求

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

## 环境配置

`.env.example` 中的配置字段：

- `ALBUMS_DIR`：图集根目录（必填）
- `INCLUDE_ANIMATED_IMAGES`：是否读取动图，默认为 `true`
- `DATABASE_PATH`：SQLite 数据库文件路径，默认为 `./data/xgallery.db`
