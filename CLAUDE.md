# Bible On Air (BOA) — 後端 API 伺服器

## 專案簡介

Bible On Air（BOA）是一個教會靈修平台，提供每日靈修內容瀏覽、聖經經文查詢、內容編輯與簽核流程，以及未來的社群功能。本倉庫為後端 REST API，供前端（Next.js）或行動裝置呼叫。

BOA 目前是一個 Google Site，每天發布一篇靈修內容，並透過 LINE 官方帳號推播。這個專案的目標是將整個流程遷移到一個有條理、可擴充的自製平台。

---

## 技術架構

| 層級     | 技術                                |
| -------- | ----------------------------------- |
| 框架     | NestJS 10 (TypeScript)              |
| ORM      | TypeORM 0.3                         |
| 資料庫   | PostgreSQL                          |
| 驗證     | class-validator + class-transformer |
| 認證     | JWT (passport-jwt)                  |
| 環境變數 | @nestjs/config                      |

前端（獨立 repo `bible-on-air-web`）：Next.js App Router
部署目標：Vercel（前端）+ Railway 或 Render（後端）+ Supabase（DB）

---

## 模組結構

```
src/
├── config/           # 資料庫與環境變數設定
├── auth/             # 登入、JWT 認證、守衛 (Guard)
├── users/            # 使用者管理（CRUD、角色）
├── articles/         # 每日靈修文章內容
├── templates/        # 靈修內容模板與 block 定義
└── bible/            # 聖經經文查詢服務
```

---

## 核心資料模型設計

### User & 角色系統

```
User {
  id, email, name, passwordHash, roles, createdAt, updatedAt
  roles: enum[] [super_admin, manager, editor, reviewer, image_editor]
}
```

**角色定義：**

| 角色           | 說明                                |
| -------------- | ----------------------------------- |
| `super_admin`  | 工程師，系統層級存取                |
| `manager`      | 事工主理人，整合所有權限 + 發布功能 |
| `editor`       | 寫作同工，負責撰寫文章              |
| `reviewer`     | 校稿同工，負責 review 和修改        |
| `image_editor` | 負責上傳背誦金句圖片                |

**設計原則：**

- 未登入訪客 = reader（無 user row），所有人都可以瀏覽已發布內容
- roles 是陣列，支援疊加（e.g. manager 同時擁有所有權限）
- `team_lead` 是疊加在角色上的 permission（Stage 2），例如 image_editor team lead 可以查看輪班表
- 設計哲學：每個人面對神話語時，都是謙卑的讀者；editor/manager 等是疊加在 user 上的服事角色

**Stage 1 Dashboard 邏輯（同角色看到相同內容，尚未個人化）：**

| 角色           | Dashboard 看到的內容           |
| -------------- | ------------------------------ |
| `editor`       | 所有 draft / reviewed 文章列表 |
| `reviewer`     | 所有待 review 的文章列表       |
| `image_editor` | 所有待上傳圖片的日期列表       |
| `manager`      | 整合以上全部 + 發布按鈕        |
| `super_admin`  | 系統層級                       |

**Stage 2 新增：**

- 文章加上 owner、reviewer、image_editor 標記
- Manager 進行排程分配
- Dashboard 變成個人化（你看到你負責的）
- team_lead permission

### 內容架構：Publication → Article → Block

```
Publication {
  id, uid, type: enum [magazine, book], title, description
  // magazine = 按日期排序（BOA uid: "bible-on-air" 是第一本）
  // book = 按章節排序（未來擴充）
}

Article {
  id, publicationId, date, templateId
  status: enum [draft, reviewed, published]
  publishedAt, createdAt, updatedAt
}

Block {
  id, articleId, order, type, subheading, content
  type: enum [verse, questions, richtext]
}

Template {
  id, name, publicationId
  blockDefinitions: BlockDefinition[]
}
```

### Block Type 行為定義

| type        | 編輯行為               | 顯示行為                     | 備註             |
| ----------- | ---------------------- | ---------------------------- | ---------------- |
| `verse`     | 輸入經文範圍，系統查找 | 顯示經文內容                 | 可依書卷查找     |
| `questions` | 逐題輸入（陣列）       | 逐題顯示，未來旁邊有筆記入口 |                  |
| `richtext`  | Rich text editor       | 排版後顯示                   | 禁止手動空格縮排 |

### BOA Standard Template（約 97% 的文章格式）

```
blocks: [
  { order: 1, type: verse,     subheading: null,        label: "經文" },
  { order: 2, type: questions, subheading: "觀察與思想",  label: "觀察與思想" },
  { order: 3, type: richtext,  subheading: "今日靈修",   label: "今日靈修" },
  { order: 4, type: verse,     subheading: "背誦經文",   label: "背誦金句" },
  { order: 5, type: richtext,  subheading: "回應與禱告", label: "回應與禱告" },
]
```

另有 BOA Free Template 處理約 3% 的自由格式內容。

---

## 經文系統（BibleService）

### 設計原則

輸入與顯示分離：編輯輸入經文「範圍」，系統負責查找並顯示經文內容。

### 內部標準格式

```typescript
interface VerseRange {
  book: string; // 標準化書卷名稱，e.g. "約翰福音"
  chapterStart: number;
  verseStart: number;
  chapterEnd?: number;
  verseEnd?: number;
}
```

### 儲存格式

DB 儲存標準化的 VerseRange（JSON）+ 快取下來的經文內容，避免每次打 API。

### 查詢層

BibleService 對外只暴露 `getVerses(range: VerseRange)` 介面：

1. 先查 DB 快取
2. 快取沒有才打外部 API（目前使用信望愛 FHL API，未來可替換）
3. API 若只支援逐節查詢，用 BIBLE_BOOKS 常數展開範圍

### BIBLE_BOOKS 常數

```typescript
const BIBLE_BOOKS = [
  {
    id: 1,
    zh: "創世記",
    en: "Genesis",
    abbrZh: "創",
    abbrEn: "Gen",
    chapters: [31, 25, 24, 26, ...]  // index = 章數-1，值 = 該章節數
  },
  // ...66 卷
]
```

用途：範圍展開、輸入驗證（防止輸入不存在的章節/經節）

---

## 編輯與簽核流程

```
editor   → 建立/編輯 Article（status: draft）
reviewer → 標記為已校閱（status: reviewed）
manager  → 按下發布（status: published）
```

- 未來保留彈性：也許有一天不再需要統一發布的動作
- 未來保留修改紀錄功能的擴充空間

---

## Stage 1 開發計劃

### 已完成

- [x] Publication / Article / Block / Template API（新增、修改、查詢）
- [x] 每日靈修內容頁（public 瀏覽）
- [x] Mini day picker / 歷史頁基本導航
- [x] BibleService（FHL 信望愛 API + VerseRange parse）

### 開發順序

**1. 登入系統**

- [x] `[1a]` User entity + role enum + seed data
- [x] `[1b]` 登入 API（JWT、Guard）
- [x] `[1c]` 前端登入頁 + token 儲存 + route protection

**2. 文章編輯**

- [ ] `[2a]` 新增文章頁（選 template、帶入 blocks、填日期）
- [ ] `[2b]` Verse block 編輯（輸入範圍 → 查詢顯示）
- [ ] `[2c]` Questions block 編輯（逐題輸入）
- [ ] `[2d]` Richtext block 編輯（選套件）

**3. 圖片上傳**

- [ ] `[3a]` 後端：圖片上傳 API（對應日期）
- [ ] `[3b]` 前端：批次上傳介面

**4. Editor & Image Editor Dashboard**

- [ ] `[4a]` Editor dashboard（所有 draft / reviewed 文章列表）
- [ ] `[4b]` Image editor dashboard（待上傳圖片日期列表）

**5. History View**

- [ ] `[5a]` 後端：取得某月所有文章 API
- [ ] `[5b]` 前端：Monthly list view

**6. Review mode + Reviewer Dashboard**

- [ ] `[6a]` Reviewer dashboard（待 review 文章列表）
- [ ] `[6b]` Review mode UI（閱讀視圖 + hover edit）
- [ ] `[6c]` 狀態流轉 API（draft → reviewed）

**7. Manager 發布 + Dashboard**

- [ ] `[7a]` 發布 API（reviewed → published）
- [ ] `[7b]` Manager dashboard + 發布按鈕

**8. PDF 匯出**

- [ ] `[8a]` 後端產生 PDF（單日或週）
- [ ] `[8b]` 前端下載入口

**9. Migration 爬蟲**

- [ ] `[9a]` 分析舊 Google Site HTML 結構
- [ ] `[9b]` 爬蟲實作 + 資料驗證
- [ ] `[9c]` 跑最近 2-3 個月 + 建立 SOP

### 暫緩到 Stage 2+

- LINE 自動推播
- Manager 進度規劃 + 排程分配
- Template 管理後台
- 各帳號個人化 dashboard
- team_lead permission
- History view 進階（書卷查找、關鍵字搜尋）
- Reader 帳號、靈修筆記、Sharing
- BookClub 社群功能
- Devotion Mode / Writing Mode / Plan Mode
- App（React Native 或 Flutter，待決定）

---

## 開發指令

```bash
# 安裝依賴
yarn install

# 複製環境變數
cp .env.example .env

# 開發模式（熱重載）
yarn start:dev

# 建置
yarn build

# 執行測試
yarn test
yarn test:e2e
```

---

## 環境變數

詳見 `.env.example`。必填項目：`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `JWT_SECRET`。

---

## 開發慣例

- API 路由統一加上 `/api/v1` 前綴
- DTO 一律使用 `class-validator` 裝飾器做輸入驗證
- Entity 檔案命名：`*.entity.ts`，TypeORM 會自動掃描
- `synchronize: true` 僅在非 production 環境啟用
- 語言：程式碼與註解用英文，CLAUDE.md 與內部文件用中文
- Block 的 `content` 欄位依 type 不同儲存不同結構的 JSON，不要用多張表硬拆

## 已知 Publication

| 欄位            | 值             |
| --------------- | -------------- |
| Publication UID | `bible-on-air` |
| Publisher UID   | `nghcc`        |
