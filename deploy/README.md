# Bible On Air 部署說明（Docker）

整套服務由三個容器組成，只有 `web` 對外開放一個連接埠：

| 容器  | 映像檔                    | 說明                                                         |
| ----- | ------------------------- | ------------------------------------------------------------ |
| `db`  | `postgres:17-alpine`      | 資料庫，資料存在 volume `db-data`                            |
| `api` | `bible-on-air-api`        | NestJS API；上傳的圖片存在 volume `uploads`                  |
| `web` | `bible-on-air-web`        | Next.js 網站；`/api/*` 與 `/uploads/*` 由它轉給 `api` 容器 |

因為所有請求都經過 `web`，網站（以及 App 的 webview）只需要一個對外網址。HTTPS 請在前面加反向代理（Nginx、Caddy、Cloudflare Tunnel 等）處理。

## 需求

- Docker 與 Docker Compose v2
- `bible-on-air-api` 與 `bible-on-air-web` 兩個 repo 放在同一層資料夾

```
some-folder/
├── bible-on-air-api/   ← 本 repo（deploy/ 在這裡）
└── bible-on-air-web/
```

## 第一次啟動

```bash
cd bible-on-air-api/deploy
cp .env.example .env      # 填入 DB_PASSWORD、JWT_SECRET、ADMIN_EMAIL、ADMIN_PASSWORD
docker compose up -d --build
```

啟動時 `api` 會自動：

1. 執行資料庫 migration（`src/database/migrations`）
2. 建立 publisher / publication / 文章模板
3. 若 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 有值且帳號不存在，建立第一個管理者（super_admin + manager）

正式環境（`NODE_ENV=production`）**不會**建立 `*@boa.test` 測試帳號。

打開 `http://<主機>:8080`（`WEB_PORT`），用管理者帳號登入 `/login`，再到 `/studio/sync`「從舊網站同步」把舊 Google Site 的內容匯入。

## 更新版本

```bash
git -C ../ pull && git -C ../../bible-on-air-web pull
docker compose up -d --build
```

Migration 會在 `api` 啟動時自動執行。

## 只交付映像檔（不在伺服器上 build）

```bash
docker compose build
docker save bible-on-air-api:latest bible-on-air-web:latest | gzip > boa-images.tar.gz
# 在伺服器上
docker load < boa-images.tar.gz
docker compose up -d --no-build
```

伺服器上只需要 `docker-compose.yml` 與 `.env`。

## 備份

```bash
# 資料庫
docker compose exec -T db pg_dump -U boa boa_db | gzip > boa-db-$(date +%F).sql.gz
# 圖片
docker run --rm -v bible-on-air_uploads:/data -v "$PWD":/backup alpine tar czf /backup/boa-uploads-$(date +%F).tar.gz -C /data .
```

## 從舊版資料庫升級

舊版開發資料庫（用 `synchronize` 建立、`articles.status` 欄位）可以直接接上：migration 會偵測已存在的資料表，並把 `status` 轉成 `submitted` / `reviewed` / `visible`，已發布的文章維持發布狀態。

## 注意事項

- `web` 的 `/api`、`/uploads` 轉發目標在 build 時決定（預設 `http://api:3001`，對應 compose 的服務名稱）。若改了服務名稱，build 時要帶 `--build-arg API_INTERNAL_URL=...`。
- API 的 Swagger 文件不對外開放；需要時可暫時把 `api` 的 `3001` 連接埠開出來，看 `/api/docs`。
