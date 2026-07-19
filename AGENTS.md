# AGENTS.md

## 项目概览

影视收藏 H5：用户可搜索电影/电视剧、查看详情（封面 + 简介 + 主演 + 导演 + 评分）、标记观看状态（想看/在看/看过/弃剧）、写个人评分（1-5 星）和备注。

整体气质是"复古私人影院"——深色背景 + 琥珀金主色 + 衬线体标题 + 玻璃质感海报。

## 技术栈

- **Framework**: Next.js 16 (App Router, custom server)
- **Core**: React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Backend**: Next.js API Routes（`src/app/api/**/route.ts`），纯调豆瓣 API，无数据库依赖
- **存储**: 全部数据存浏览器 `localStorage`，零服务端存储

## 目录结构

```
src/
├── app/
│   ├── api/                  # API 路由
│   │   ├── search/route.ts   # GET 搜索影视（豆瓣 subject_suggest + subject_abstract）
│   │   ├── media/[id]/route.ts # GET 播放平台（豆瓣 rexxar API）
│   │   └── poster/route.ts   # GET 豆瓣图片代理（防 Referer 防盗链）
│   ├── components/ui/        # shadcn 组件
│   ├── components/media/     # 业务组件
│   │   ├── CollectionTab.tsx  # 合并搜索+收藏（搜索模式 / 收藏模式）
│   │   ├── Poster.tsx        # 海报组件（渐变/真实图片/豆瓣代理）
│   │   ├── DetailSheet.tsx   # 影视详情弹窗
│   │   ├── ProfileTab.tsx    # 我的（统计+导入导出）
│   │   └── BottomNav.tsx     # 底部导航（收藏页/我的）
│   ├── lib/
│   │   ├── client.ts         # 客户端 fetch 封装 + device id hook
│   │   ├── device.ts         # 服务端 device id 解析
│   │   ├── local-favorites.ts # localStorage 收藏增删改查
│   │   └── media-types.ts    # 影视/收藏/状态 类型与常量
│   ├── globals.css           # 设计 token + 自定义动画
│   ├── layout.tsx
│   └── page.tsx              # 两 Tab 单页（收藏页/我的）
```

## 数据模型

所有数据存储在浏览器 `localStorage`，类型定义见 `src/lib/local-favorites.ts`：

`LocalFavorite`:
- `douban_id` (主键) · `media_id` · `title` · `original_title?` · `type movie|tv` · `year?`
- `director?` · `actors?` · `genre?` · `region?` · `description?`
- `poster_url?` · `backdrop_url?` · `rating?`
- `status wish|watching|watched|dropped` · `personal_rating?` · `note?` · `progress?`
- `created_at` · `updated_at`

## 设备隔离 & 数据存储

- **收藏数据全部存储在浏览器 `localStorage`**，按设备隔离（每设备独立 UUID）
- 读写通过 `src/lib/local-favorites.ts` 中的 `getLocalFavorites()` / `upsertLocalFavorite()` / `removeLocalFavorite()` 等函数
- 搜索和详情由后端 API 直接调豆瓣接口，不经过任何数据库
- 导出：从 localStorage 读取 → 下载 JSON 文件（纯前端操作）
- 导入：读取 JSON 文件 → 写入 localStorage（纯前端操作）

## API 约定

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/search?q=xxx` | GET | 调豆瓣 subject_suggest + subject_abstract，直接返回结果，最多 20 条 |
| `/api/media/[id]` | GET | 调豆瓣 rexxar API 获取播放平台（vendors） |
| `/api/poster?url=xxx` | GET | 代理豆瓣图片，绕过 Referer 防盗链 |

## 关键实现细节

- **海报**：`Poster` 组件只接受 `posterUrl` 字符串，自己解析 `gradient:hex1/hex2` 协议，渲染为 `linear-gradient(135deg, #c1, #c2)`。若 URL 为 null，用 fallback 深棕色渐变。
- **状态徽章颜色**：`STATUS_COLORS` 在 `lib/media-types.ts` 定义了 4 种状态对应的 Tailwind 颜色（amber / emerald / rose / zinc）。
- **设备 ID 注入**：`useDeviceId()` hook 在 `useEffect` 里读 localStorage，避免 SSR 阶段的 hydration mismatch。
- **筛选功能**：搜索框右侧筛选按钮，展开/折叠面板。状态筛选（想看/在看/看过/弃剧）默认常驻；风格筛选（从收藏去重）单选+全部按钮。筛选偏好缓存到 localStorage。

## 本地开发

```bash
pnpm install
coze dev                    # 启动（端口 5000，由 DEPLOY_RUN_PORT 控制）
```

## 测试

- 静态检查：`pnpm ts-check`、`pnpm lint --quiet`
- 接口冒烟：用 `test_run` 工具覆盖 `search / media/[id]` 两个端点

## 常见坑

- **`pnpm` only**：禁止用 npm/yarn
- **不要在 JSX 渲染时读 `window` / `Date.now()` / `Math.random()`**：必须用 `useEffect + useState` 包裹
- **禁止使用 `<head>` 标签**：用 metadata API 或 `ReactDOM.preload` / `ReactDOM.preconnect`
- **搜索 API 纯调豆瓣**：不依赖任何数据库，部署无需环境变量
