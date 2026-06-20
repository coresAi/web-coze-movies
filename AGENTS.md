# AGENTS.md

## 项目概览

影视收藏 H5：用户可搜索电影/电视剧、查看详情（封面 + 简介 + 主演 + 导演 + 评分）、标记观看状态（想看/在看/看过/弃剧）、写个人评分（1-5 星）和备注。

整体气质是"复古私人影院"——深色背景 + 琥珀金主色 + 衬线体标题 + 玻璃质感海报。

## 技术栈

- **Framework**: Next.js 16 (App Router, custom server)
- **Core**: React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Backend**: Next.js API Routes（`src/app/api/**/route.ts`）
- **DB**: Supabase（PostgreSQL），两张表：`media_items`、`favorites`
- **数据填充**: `scripts/seed.ts`（手写 50 部热门影视作为初始数据）

## 目录结构

```
src/
├── app/
│   ├── api/                  # API 路由
│   │   ├── search/route.ts   # GET 搜索影视（豆瓣 subject_suggest + subject_abstract）
│   │   ├── media/[id]/route.ts # GET 媒体详情
│   │   ├── poster/route.ts   # GET 豆瓣图片代理（防 Referer 防盗链）
│   │   └── favorites/route.ts # GET 列表 / POST upsert（partial update）/ DELETE 删除
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
│   │   └── media-types.ts    # 影视/收藏/状态 类型与常量
│   ├── storage/database/
│   │   ├── shared/schema.ts  # drizzle schema 定义
│   │   └── supabase-client.ts # Supabase 客户端单例（service_role）
│   ├── globals.css           # 设计 token + 自定义动画
│   ├── layout.tsx
│   └── page.tsx              # 两 Tab 单页（收藏页/我的）
scripts/
└── seed.ts                   # 一次性预填 50 部影视
```

## 数据模型

`media_items`:
- `id uuid PK` · `title text` · `original_title text?` · `type movie|tv` · `year int?`
- `director text?` · `actors text[]?` · `genre text[]?` · `region text?`
- `description text?` · `poster_url text?` · `rating numeric?`
- 海报用 CSS 渐变占位：`poster_url = "gradient:hex1/hex2"`，前端 `Poster` 组件解析

`favorites`:
- 复合唯一键 `(device_id, media_id)`
- `status wish|watching|watched|dropped` · `personal_rating int?` · `note text?` · `progress int?`

## 设备隔离

- 无登录态：使用 `localStorage` 存 `media_device_id`（UUID），请求时通过 `x-device-id` header 透传
- 服务端 `lib/device.ts` 兜底从 cookie 取，再不行生成新的（httpOnly + 1y）
- API 不区分用户 → 所有设备共享 `media_items`，`favorites` 按 device 隔离

## API 约定

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/search?q=xxx` | GET | 模糊匹配 title / original_title / director / actors（PostgreSQL `ilike` + `cs`），按 rating 降序，最多 20 条 |
| `/api/media/[id]` | GET | 返回媒体 + 当前设备 favorite 状态（需 `x-device-id`） |
| `/api/favorites` | GET | 列出当前设备收藏，可选 `?status=xxx` 过滤 |
| `/api/favorites` | POST | upsert，支持 **partial update**：未传的字段保留 DB 已有的值 |
| `/api/favorites?media_id=xxx` | DELETE | 删除收藏 |

## 关键实现细节

- **Partial update**：`POST /api/favorites` 先 `select *` 查已有记录，再 merge 未传入的字段后 upsert。这样前端调同一个接口既能新增又能改状态/评分/备注。
- **海报**：`Poster` 组件只接受 `posterUrl` 字符串，自己解析 `gradient:hex1/hex2` 协议，渲染为 `linear-gradient(135deg, #c1, #c2)`。若 URL 为 null，用 fallback 深棕色渐变。
- **状态徽章颜色**：`STATUS_COLORS` 在 `lib/media-types.ts` 定义了 4 种状态对应的 Tailwind 颜色（amber / emerald / rose / zinc）。
- **设备 ID 注入**：`useDeviceId()` hook 在 `useEffect` 里读 localStorage，避免 SSR 阶段的 hydration mismatch。

## 本地开发

```bash
pnpm install
pnpm tsx scripts/seed.ts   # 首次：预填 50 部影视
coze dev                    # 启动（端口 5000，由 DEPLOY_RUN_PORT 控制）
```

## 测试

- 静态检查：`pnpm ts-check`、`pnpm lint --quiet`
- 接口冒烟：用 `test_run` 工具覆盖 `search / media/[id] / favorites` 三个端点
- partial update 行为：先 POST 全字段，再 POST 只传 status，验证未传字段保留

## 常见坑

- **`pnpm` only**：禁止用 npm/yarn
- **不要在 JSX 渲染时读 `window` / `Date.now()` / `Math.random()`**：必须用 `useEffect + useState` 包裹
- **禁止使用 `<head>` 标签**：用 metadata API 或 `ReactDOM.preload` / `ReactDOM.preconnect`
- **Supabase 操作必须经过 API route**：前端不直连，避免泄露 service_role key
- **`/api/favorites` POST 不传 personal_rating/note 时会保留 DB 已有的值**，别误以为是 bug
