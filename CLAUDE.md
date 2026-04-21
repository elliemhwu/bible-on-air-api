# Bible On Air (BOA) — 後端 API 伺服器

## 專案簡介

Bible On Air 是一個靈修平台，提供每日靈修內容、聖經經文查詢、以及內容模板管理功能。本倉庫為後端 REST API，供前端或行動裝置呼叫。

## 技術架構

| 層級 | 技術 |
|------|------|
| 框架 | NestJS 10 (TypeScript) |
| ORM | TypeORM 0.3 |
| 資料庫 | PostgreSQL |
| 驗證 | class-validator + class-transformer |
| 認證 | JWT (passport-jwt) |
| 環境變數 | @nestjs/config |

## 模組結構

```
src/
├── config/           # 資料庫與環境變數設定
├── auth/             # 登入、JWT 認證、守衛 (Guard)
├── users/            # 使用者管理（CRUD、角色）
├── articles/         # 每日靈修文章內容
├── templates/        # 靈修內容模板
└── bible/            # 聖經經文查詢服務
```

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

## 環境變數

詳見 `.env.example`。必填項目：`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `JWT_SECRET`。

## 慣例

- 所有 API 路由統一加上 `/api` 前綴（`app.setGlobalPrefix('api')`）
- DTO 一律使用 `class-validator` 裝飾器做輸入驗證
- Entity 檔案命名：`*.entity.ts`，TypeORM 會自動掃描
- `synchronize: true` 僅在非 production 環境啟用
