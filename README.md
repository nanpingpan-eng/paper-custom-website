# Paper Custom — 部署文档

## 项目结构

```
paper-custom/
├── frontend/              # 前端静态文件（上传服务器直接访问）
│   ├── index.html         # 首页
│   ├── products.html      # 产品列表页
│   ├── product.html       # 产品详情页
│   ├── about.html         # 关于我们
│   ├── contact.html       # 联系/询价页
│   ├── css/
│   │   └── style.css      # 全局样式
│   ├── js/
│   │   └── main.js        # 前端交互
│   └── admin/
│       └── index.html     # 后台管理系统（嵌套在 frontend 内）
│
└── backend/               # 后端 Node.js 服务
    ├── server.js           # 主服务器
    ├── package.json
    ├── database.db        # SQLite 数据库（自动生成）
    └── uploads/           # 上传图片（自动生成）
        └── products/
```

---

## 🚀 快速部署

### 第一步：安装依赖

```bash
cd backend
npm install
```

### 第二步：启动后端服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start

# 或后台运行（推荐生产环境）
pm2 start server.js --name paper-custom
```

服务默认运行在 `http://localhost:3000`

### 第三步：访问网站

- **前台网站**: http://localhost:3000
- **后台管理**: http://localhost:3000/admin/
- **API 文档**: 见下方 API 列表

---

## ⚙️ 服务器配置

### 环境变量

在 `backend/` 目录创建 `.env` 文件：

```env
PORT=3000
SITE_URL=https://yourdomain.com
```

### Nginx 反向代理配置（推荐）

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 重定向 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 上传图片大小限制
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传图片缓存
    location /uploads/ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

### PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start backend/server.js --name paper-custom

# 查看状态
pm2 status

# 开机自启
pm2 startup
pm2 save
```

---

## 📦 API 接口文档

### 分类管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/categories | 获取所有分类 |
| POST | /api/categories | 新建分类 |
| PUT | /api/categories/:id | 更新分类 |
| DELETE | /api/categories/:id | 删除分类 |

### 产品管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/products | 获取产品列表（支持分页、筛选、搜索） |
| GET | /api/products/:slug | 获取产品详情 |
| POST | /api/products | 新建产品（支持多图上传） |
| PUT | /api/products/:id | 更新产品 |
| DELETE | /api/products/:id | 删除产品 |

**GET /api/products 查询参数：**
- `category` — 分类 slug 筛选
- `featured` — 只返回精选产品（值为 `1`）
- `search` — 关键词搜索
- `limit` — 每页数量（默认全部）
- `offset` — 偏移量（用于分页）

### 产品图片

| 方法 | 路径 | 说明 |
|------|------|------|
| DELETE | /api/product-images/:id | 删除图片 |
| PATCH | /api/product-images/:id/primary | 设为主图 |

### 询价管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/inquiries | 提交询价（前台） |
| GET | /api/inquiries | 获取所有询价（后台） |
| PATCH | /api/inquiries/:id/status | 更新询价状态 |

### SEO/AI 搜索

| 路径 | 说明 |
|------|------|
| /sitemap.xml | 站点地图（自动生成） |
| /robots.txt | 爬虫规则 |

---

## 🏷️ 内容填写指南

网站中所有 `[...]` 标记的内容需要您填写，包括：

1. **品牌名称** — 替换所有 `[品牌名称]` 字样
2. **公司信息** — 公司全称、地址、电话、邮箱
3. **关于我们** — 公司简介、工厂介绍、品牌故事
4. **认证资质** — 填写实际持有的认证
5. **Hero 图片** — 替换占位图为实际产品图
6. **SITE_URL** — 在 .env 中设置实际域名（影响 sitemap）

---

## 🔒 安全建议

- 为后台管理 `/admin/` 路径添加访问认证（如 Nginx Basic Auth 或独立登录系统）
- 定期备份 `backend/database.db` 文件
- 定期备份 `backend/uploads/` 目录

---

## 🌐 AI 搜索优化说明

本网站已内置以下 AI/SEO 友好特性：

1. **结构化数据** — 每个页面包含 Schema.org JSON-LD
2. **语义化 HTML** — 使用 `<nav>`, `<main>`, `<article>` 等语义标签
3. **自动 Sitemap** — `/sitemap.xml` 随产品数据实时生成
4. **Meta 标签完整** — title、description、OG、Twitter Card 全覆盖
5. **robots.txt** — 引导搜索引擎正确抓取
6. **产品页 slug** — 语义化 URL 结构

---

## 📋 Node.js 依赖

- **express** — Web 框架
- **better-sqlite3** — SQLite 数据库（零配置，文件型）
- **multer** — 文件上传处理
- **cors** — 跨域支持

最低 Node.js 版本：**18.0.0**
