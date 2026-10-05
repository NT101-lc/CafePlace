# Quản lý quán cà phê (CMS)

[![CI](https://github.com/NT101-lc/CafePlace/actions/workflows/ci.yml/badge.svg)](https://github.com/NT101-lc/CafePlace/actions/workflows/ci.yml)

SaaS quản lý quán cà phê nhỏ: nhiều quán dùng chung một hệ thống, dùng trên điện thoại/tablet dưới dạng PWA, tạo đơn được cả khi mất mạng.

> Trạng thái: **khung dự án**. Đã có đăng ký quán, đăng nhập, cách ly dữ liệu giữa các quán, PWA, khung đồng bộ offline. Chưa có nghiệp vụ menu, đơn hàng, báo cáo.

## Cấu trúc

```
backend/    Spring Boot 4 (Java 21), package theo tính năng: auth, shop, menu, order, common
frontend/   React + Vite + TypeScript: pages, components, api, db (Dexie), sync
deploy/     docker-compose production, Caddyfile, backup.sh
docker-compose.dev.yml   PostgreSQL + RustFS (lưu ảnh món) cho dev/test
CLAUDE.md   bối cảnh, quy ước code, cách hoạt động multi-tenant — nên đọc trước
```

## Chạy khi phát triển

Cần cài: **JDK 21**, **Node.js 24 LTS**, **Docker Desktop**. Không cần cài Maven (đã có Maven Wrapper).

```bash
# 1. PostgreSQL + RustFS (một lần, chạy nền). Console RustFS: http://localhost:9101/rustfs/console/
docker compose -f docker-compose.dev.yml up -d

# 2. Backend → http://localhost:8080/api/health
cd backend
./mvnw spring-boot:run        # Windows PowerShell/cmd: .\mvnw.cmd spring-boot:run  (cần JDK 21 trong JAVA_HOME)

# 3. Frontend (terminal khác) → http://localhost:5173
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173 → "Đăng ký quán mới".

## Kiểm tra

```bash
cd backend && ./mvnw verify          # build + test (cần Postgres + RustFS dev đang chạy)
cd frontend && npm run lint && npm run build
```

CI (GitHub Actions, `.github/workflows/ci.yml`) chạy cả hai mỗi lần push/PR.

## Triển khai production

Trên một server Linux có Docker, tên miền đã trỏ về IP server:

```bash
cp .env.example deploy/.env    # sửa DOMAIN, DB_PASSWORD, JWT_SECRET
cd deploy
docker compose up -d --build
```

Caddy tự lấy chứng chỉ HTTPS. Sao lưu: `deploy/backup.sh` lưu cả database lẫn ảnh món (đặt cron hằng ngày; nhớ chép file backup ra khỏi server).
