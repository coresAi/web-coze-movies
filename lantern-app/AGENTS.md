# AGENTS.md

## 项目概览

灯箱收藏 (Lantern) — Expo (React Native) 独立 App。用户可搜索电影/电视剧、查看详情、标记观看状态、写个人评分和备注。**纯本地存储，无后端依赖。**

整体气质是"复古私人影院"——深色背景 + 琥珀金主色 + 衬线体标题 + 玻璃质感海报。

## 技术栈

- **Framework**: Expo SDK 57 + Expo Router (file-based routing)
- **Core**: React 19 + TypeScript 5
- **Styling**: React Native StyleSheet (design tokens inline)
- **Storage**: @react-native-async-storage/async-storage
- **Icons**: @expo/vector-icons (Ionicons)
- **Data Source**: 豆瓣 API 直调（subject_suggest + subject_abstract + rexxar），无后端代理

## 目录结构

```
app/
├── _layout.tsx           # 根布局（Stack navigator + storage init）
├── (tabs)/
│   ├── _layout.tsx       # Tab 导航（收藏页 / 我的）
│   ├── index.tsx         # 收藏页（搜索 + 收藏网格 + 筛选）
│   └── profile.tsx       # 我的（统计 + 导入导出）
└── detail.tsx            # 影视详情（modal 弹窗）

src/
├── lib/
│   ├── types.ts          # 类型定义（LocalFavorite, WatchStatus, Vendor 等）
│   ├── storage.ts        # AsyncStorage CRUD + 同步缓存
│   └── douban.ts         # 豆瓣 API 直调（搜索/详情/播放平台）
└── components/
    └── Poster.tsx        # 海报组件（渐变兜底 + 远程图片）
```

## 数据模型

`LocalFavorite` (AsyncStorage key: `@lantern/favorites`):
- `douban_id` · `media_id` · `title` · `original_title` · `poster_url` · `backdrop_url`
- `type` (movie/tv) · `year` · `rating` · `director` · `actors[]` · `genre[]` · `region`
- `description` · `status` (wish/watching/watched/dropped)
- `personal_rating` (1-5) · `note` · `progress`
- `created_at` · `updated_at`

## 关键实现细节

- **同步读取**：storage.ts 维护内存缓存 `_cache`，`getFavorites()` 同步返回。`initStorage()` 在 `_layout.tsx` 挂载时调用，从 AsyncStorage 加载到缓存。
- **写入异步**：`upsertFavorite()` / `removeFavorite()` / `setFavorites()` 异步写入 AsyncStorage 并更新缓存。
- **搜索**：`searchDouban()` 调豆瓣 subject_suggest → 逐个调 subject_abstract 补充详情字段。
- **详情**：`getDoubanDetail()` + `getDoubanVendors()` 补充完整字段并同步到 localStorage。
- **导入导出**：使用 expo-file-system v57 新 API（`File` + `Paths` + `writableStream`），expo-sharing 分享，expo-document-picker 选取文件。

## 本地开发

```bash
pnpm install
npx expo start        # 启动 Expo dev server
```

## 设计规范

见 DESIGN.md（复古影院风格：`#0F0E0C` 深色底 + `#E8A33D` 琥珀金 + `#1C1814` 卡片 + 衬线体标题）

## 常见坑

- **expo-file-system v57**：API 大改，用 `File` / `Directory` / `Paths` 类替代旧版 `FileSystem.xxx` 静态方法
- **AsyncStorage 异步**：所有读操作通过缓存同步返回，避免 UI 中 await
- **豆瓣 API 需要 Referer**：fetch 时带上 `Referer: https://movie.douban.com/`
- **`pnpm` only**：禁止用 npm/yarn
