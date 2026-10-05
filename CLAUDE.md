# CLAUDE.md

Ghi chú cho các phiên làm việc sau (người hoặc AI). Đọc hết trước khi sửa code.

## Bối cảnh

- SaaS quản lý quán cà phê nhỏ ở Việt Nam. Nhiều quán dùng chung **một backend, một database**; dữ liệu mỗi quán tách bằng cột `shop_id` (multi-tenant).
- Quán dùng qua trình duyệt điện thoại/tablet dưới dạng **PWA**; phải **tạo được đơn khi mất mạng** rồi đồng bộ lại.
- Một sinh viên làm một mình, đang học Java + Spring Boot → **ưu tiên code đơn giản, dễ đọc, ít thành phần**.
- **Không** dùng microservices, Kubernetes, Redis, message queue. **Không thêm thư viện ngoài stack bên dưới khi chưa hỏi.** (RustFS + AWS SDK được thêm theo yêu cầu của người dùng để lưu ảnh ngoài Postgres.)

## Stack

| Phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 4.1 (Maven Wrapper), Spring Web MVC, Spring Data JPA (Hibernate 7), Spring Security + JWT (`spring-boot-starter-security-oauth2-resource-server`, HS256), Validation, Flyway |
| Database | PostgreSQL 16 |
| Lưu file | RustFS 1.0.1 (tương thích S3), backend dùng AWS SDK for Java v2 (`s3` + `url-connection-client`, đã loại Apache/Netty client) |
| Frontend | React 19 + Vite 8 + TypeScript, React Router 8 (chế độ khai báo `<Routes>`), vite-plugin-pwa (Workbox), Dexie 4 (IndexedDB), oxlint |
| Hạ tầng | Docker Compose (app + postgres + rustfs + Caddy), GitHub Actions |

Lưu ý Spring Boot 4: starter web là `spring-boot-starter-webmvc`; Jackson 3 nằm ở package `tools.jackson.*` (annotation vẫn là `com.fasterxml.jackson.annotation`); `@AutoConfigureMockMvc` ở `org.springframework.boot.webmvc.test.autoconfigure`.

## Quy ước

- **Giao diện và thông báo cho người dùng: tiếng Việt.** Tên biến, hàm, class, comment trong code: tiếng Anh.
- Backend **chia package theo tính năng**, không theo tầng: `auth`, `shop`, `menu`, `order`, `common`. Controller, service, entity, repository, dto của một tính năng nằm chung package.
- Tiền: `BIGINT`/`long`, đơn vị VND, không có số lẻ. Thời gian: `TIMESTAMPTZ`/`Instant`.
- Không dùng Lombok. Entity có constructor `protected` rỗng cho JPA, getter/setter viết tay. DTO dùng `record`.
- Schema chỉ thay đổi bằng migration Flyway mới `V{n}__mo_ta.sql` trong `backend/src/main/resources/db/migration/`. **Không sửa migration đã chạy.** Hibernate chỉ `validate`.
- Lỗi cho người dùng: `throw new AppException(HttpStatus, "CODE", "Thông báo tiếng Việt")`. Mọi lỗi trả JSON `{ "code", "message", "fields"? }` (xem `common/error`). Frontend đọc bằng `ApiError` trong `src/api/client.ts`.
- Validation: annotation trên record request với `message = "..."` tiếng Việt.
- Frontend gọi API **chỉ qua** `apiFetch()` (tự gắn JWT, tự đổi lỗi thành `ApiError`). Không dùng axios.
- Phân quyền theo vai trò: `@PreAuthorize("hasRole('OWNER')")` trên method của controller (đã bật `@EnableMethodSecurity`). Bị từ chối thì trả 403 JSON `FORBIDDEN`.

## Frontend: cấu trúc và UI

```
src/api/          gọi backend (client.ts = apiFetch, session.ts, auth.ts, menu.ts…); mỗi tính năng một file
src/db/           Dexie (IndexedDB)
src/sync/         đồng bộ offline
src/hooks/        hook dùng chung: useOnlineStatus, useToast
src/lib/          hàm thuần: format.ts (formatVnd, normalizeSearch bỏ dấu, compareVi…)
src/components/   component dùng chung (Button, FormField, Sheet, Switch, EmptyState, Icon, ToastProvider, AppLayout, AuthLayout)
src/components/<tính năng>/   component riêng của một tính năng, ví dụ components/menu/MenuItemSheet.tsx
src/pages/        một file cho mỗi route (+ file .css cùng tên nếu cần)
```

Quy ước UI (đã chốt với người dùng: CSS thuần, không thư viện UI; thiết kế cho cả điện thoại dọc lẫn tablet ngang):

- **Design token** nằm trong `:root` của `src/index.css` (màu, khoảng cách `--space-*`, bo góc, bóng, cỡ chữ). Không viết cứng mã màu trong component; dùng `var(--...)`.
- Mỗi component có file `.css` riêng cạnh file `.tsx`, import trong component. Các class dùng chung (`.page-header`, `.notice`, `.chip`, `.badge`, `.toggle-row`, `.skeleton`, `.spacer`) nằm trong `index.css`.
- Bố cục: dưới 900px là thanh trên + tab bar ở đáy; từ 900px trở lên là sidebar trái. Lưới thẻ 1/2/3 cột ở các mốc 640px và 1100px. Vùng chạm tối thiểu 44px (`--touch-target`).
- Form: dùng `FormField` (label, hint, suffix như `đ`, error). Lỗi theo trường lấy từ `ApiError.fields`. Ô tiền: lưu chuỗi chữ số, hiển thị bằng `formatNumber`, có `inputMode="numeric"`.
- Hộp thoại: dùng `Sheet` (thẻ `<dialog>` gốc; bottom sheet trên điện thoại, hộp giữa màn hình trên tablet). Chỉ mount khi đang mở, với `key` theo bản ghi để form reset.
- Phản hồi: `useToast().show('…')` sau khi lưu, xóa hoặc đổi trạng thái thành công; `show(msg, 'error')` khi lỗi. Thao tác nhanh (như bật/tắt hết món) cập nhật lạc quan, lỗi thì hoàn tác.
- Xóa: bấm hai lần ("Bấm lần nữa để xóa"), không dùng `window.confirm`.
- Mỗi trang có đủ trạng thái: đang tải (skeleton), trống (`EmptyState` + nút hành động), lỗi (nút "Thử lại"), mất mạng (`notice-warning`, khóa các thao tác ghi).
- Icon: thêm vào `components/Icon.tsx` (SVG inline 24×24, nét 1.8). Không cài thư viện icon.
- Trợ năng: nút chỉ có icon phải có `aria-label`; công tắc dùng `role="switch"`; tìm kiếm không phân biệt dấu (`normalizeSearch`).

## Menu: nhóm và ảnh

- **Nhóm món** (`menu_categories`, có `sort_order`): không có API tạo/xóa riêng. Lưu món với tên nhóm mới thì nhóm được tạo ở cuối danh sách; nhóm không còn món thì tự xóa (`MenuCategoryService`). API món vẫn nhận và trả tên nhóm (`category`), kèm `categoryId`.
- Thứ tự hiển thị: theo `sort_order` của nhóm (món không có nhóm ở cuối, hiện là "Khác"), rồi theo tên (Collator tiếng Việt). Chủ quán đổi thứ tự bằng `PUT /api/menu-categories/order` (phải gửi đủ mọi id).
- DB đảm bảo món chỉ thuộc nhóm của chính quán đó: khóa ngoại kép `(category_id, shop_id)` → `menu_categories (id, shop_id)`.

## Ảnh và lưu trữ file (RustFS)

Code ở `common/storage` (`ObjectStorage`, `MediaController`) và `menu/MenuImageService`.

- **Luồng tải lên:** trình duyệt thu nhỏ ảnh (cạnh dài tối đa 800px, WebP, JPEG nếu trình duyệt không hỗ trợ; xem `frontend/src/lib/image.ts`) → `PUT /api/menu-items/{id}/image` với body là file thô → backend kiểm tra **loại file theo vài byte đầu** (JPEG/PNG/WebP), tối đa 2MB → lưu vào bucket với key `menu/{shopId}/{uuid}.{ext}` → ghi key vào `menu_items.image_key` → xóa file cũ.
- **Luồng xem:** `GET /api/media/menu/{shopId}/{uuid}.{ext}` **công khai** (thẻ `<img>` không gửi được JWT). Tên file là UUID ngẫu nhiên, mỗi lần tải lên là một tên mới, nên trả về với `Cache-Control: immutable` 1 năm; service worker cũng cache ảnh (`menu-images`, CacheFirst) để xem khi mất mạng.
- Bucket **riêng tư**: RustFS không mở cổng ra ngoài ở production; mọi truy cập đi qua backend. Bucket tự được tạo khi backend khởi động.
- Thêm loại file mới (ví dụ logo quán): tạo key với tiền tố riêng (`shop-logo/{shopId}/...`), thêm route tương ứng trong `MediaController` với regex tên file chặt chẽ.
- File thừa (ví dụ upload xong nhưng lưu DB lỗi) chỉ ghi log, không ảnh hưởng chức năng.

## Multi-tenant: cách lọc theo shop_id

Dùng tính năng `@TenantId` có sẵn của Hibernate (code ở `backend/src/main/java/com/cms/common/tenant/`):

1. JWT có claim `shop_id`. Spring Security xác thực token và đặt nó vào `SecurityContext`.
2. `TenantContext.currentShopId()` đọc `shop_id` từ JWT. Nếu không có JWT thì trả `NO_SHOP = 0`: không quán nào có id 0, nên đọc ra rỗng và ghi thì lỗi khóa ngoại (chặn mặc định, không bao giờ lộ dữ liệu).
3. `ShopTenantResolver` báo giá trị đó cho Hibernate. Hibernate **tự thêm `shop_id = ?` vào mọi truy vấn** (JPQL, method của Spring Data, `findById`) và **tự gán `shop_id` khi insert**.
4. Entity nghiệp vụ chỉ cần `extends TenantScopedEntity`.

Ngoại lệ có chủ đích:

- `TenantContext.callAsSystem(...)`: phiên "root", **không lọc** và cho gán `shop_id` thủ công. Chỉ dùng cho đăng ký và đăng nhập (lúc chưa có JWT), xem `AuthService`.
- `TenantContext.callAsShop(id, ...)`: chạy dưới tư cách một quán mà không cần JWT (job nền, test).
- Hai hàm trên phải gọi **bên ngoài transaction**, vì Hibernate chốt quán khi mở session (đầu transaction). Bên trong thì dùng `TransactionTemplate`. Gọi sai sẽ ném `IllegalStateException`.
- `Shop` không phải entity theo quán (nó chính là quán). Muốn lấy quán hiện tại thì dùng `shopRepository.findById(TenantContext.currentShopId())`.

⚠️ **SQL native (`@Query(nativeQuery = true)`, `JdbcTemplate`) KHÔNG được lọc tự động**: phải tự viết `WHERE shop_id = :shopId` với `TenantContext.currentShopId()`. Tránh dùng nếu không thật cần.

### Thêm một entity nghiệp vụ mới (ví dụ `tables` – bàn)

1. Tạo migration mới (số tiếp theo, ví dụ `V3__create_tables.sql`): bảng có `shop_id BIGINT NOT NULL REFERENCES shops (id)`, index trên `shop_id`; ràng buộc unique nào cũng nên kèm `shop_id` (ví dụ `UNIQUE (shop_id, name)`).
2. Tạo package theo tính năng, ví dụ `com.cms.table`, với entity `extends TenantScopedEntity`. **Không** tự khai báo field `shopId`.
3. Tạo `JpaRepository` như bình thường; các truy vấn đã được lọc sẵn.
4. Thêm một test kiểu `TenantIsolationTest`: quán B không đọc được bản ghi của quán A.

## Đồng bộ offline (frontend)

- Menu: `src/api/menu.ts` hiện bản lưu trong Dexie trước, rồi tải lại từ server khi có mạng; mỗi lần ghi thành công cũng cập nhật Dexie. Khi đăng xuất thì xóa bản sao menu (máy có thể được quán khác dùng). Sửa menu cần có mạng.
- `src/db/db.ts`: Dexie, bảng `menu_items` và `menu_categories` (bản sao menu, từ version 2) và `pending_orders` (đơn tạo trên máy, chưa được server xác nhận). Muốn đổi schema thì thêm `db.version(n)` mới, không sửa version cũ.
- Mỗi đơn có `clientId` (UUID do máy sinh). Server có `UNIQUE (shop_id, client_id)` nên gửi lại nhiều lần không tạo đơn trùng.
- `src/sync/sync.ts`: đọc `pending_orders` của quán hiện tại, gửi từng đơn lên `POST /api/orders/sync` (**endpoint chưa viết**), xóa bản local khi server xác nhận. Chạy khi mở app, khi có mạng lại, và mỗi 30 giây. Các phần còn thiếu được đánh dấu `TODO`.
- Service worker (Workbox) cache **giao diện** và **ảnh món** (`/api/media/`); dữ liệu offline nằm trong IndexedDB. Ở `npm run dev` service worker bị tắt; muốn thử PWA thì dùng `npm run build && npm run preview`.

## Lệnh

Cần: JDK 21, Node 24 LTS, Docker. Chạy từ thư mục gốc repo trừ khi ghi khác.

```bash
# PostgreSQL (DB cms + cms_test) và RustFS (S3 ở :9100, console http://localhost:9101/rustfs/console/, key cms-dev / cms-dev-secret)
docker compose -f docker-compose.dev.yml up -d

# Backend: http://localhost:8080 (profile dev mặc định, không cần biến môi trường)
cd backend && ./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run (phải có .\)
cd backend && ./mvnw verify                    # build + toàn bộ test (cần Postgres và RustFS dev đang chạy)
cd backend && ./mvnw test -Dtest=TenantIsolationTest

# Frontend: http://localhost:5173 (proxy /api → :8080)
cd frontend && npm install && npm run dev
cd frontend && npm run lint && npm run build
cd frontend && npm run preview                 # thử bản build + PWA ở :4173

# Production (trên server)
cp .env.example deploy/.env                    # rồi sửa giá trị thật
cd deploy && docker compose up -d --build
deploy/backup.sh                               # pg_dump + ảnh RustFS → deploy/backups/, giữ 14 ngày
```

### Ghi chú khi dev trên Windows (máy hiện tại)

- Máy có cả JDK 17 và JDK 21. Nếu `java -version` ra 17 thì đặt `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` trước khi chạy `mvnw`.
- Gọi wrapper bằng `.\mvnw.cmd`. Gõ `mvnw.cmd` không có `.\` có thể báo "not recognized".
- PowerShell trên máy đang chặn chạy script (execution policy), nên Terminal panel của Claude desktop không khởi động được. Khi cần chạy server cho người dùng xem thì mở cửa sổ `cmd` riêng.
- Trong Git Bash: gửi JSON có tiếng Việt bằng `curl --data-binary @file.json` (gõ thẳng trên dòng lệnh sẽ sai bảng mã), và đặt `MSYS_NO_PATHCONV=1` khi truyền đường dẫn Linux vào `docker run`.
- Cổng 9000/9001 trên máy đang thuộc container `minio` của dự án khác, nên RustFS dev dùng **9100/9101**. Không đụng vào container đó.
- Tài khoản test của database dev nằm trong `DEV_ACCOUNTS.local` ở thư mục gốc (git bỏ qua, chỉ có trên máy này). Không chép mật khẩu ra chỗ khác.

## CI (`.github/workflows/ci.yml`)

Chạy khi push lên `main`, khi có pull request, và chạy tay được (workflow_dispatch). Một lần push mới hủy lần chạy cũ của cùng nhánh.

| Job | Làm gì |
|---|---|
| `backend` | `./mvnw -B verify` với service PostgreSQL 16 (DB `cms_test`, user/pass `cms`) và RustFS (cổng 9100, key `cms-dev`/`cms-dev-secret`), khớp `application-test.yml`. Nếu fail thì upload surefire reports làm artifact. |
| `frontend` | `npm ci` → `npm run lint` (oxlint) → `npm run build` (tsc + vite + service worker). |
| `deploy-check` | Chạy sau hai job trên: kiểm tra `deploy/docker-compose.yml` với `.env.example`, shellcheck `deploy/backup.sh`, build image backend và web (frontend + Caddy), rồi `caddy validate`. |

- `backend/mvnw` và `deploy/backup.sh` phải có quyền thực thi trong git. Repo tạo trên Windows nên phải đặt bằng `git update-index --chmod=+x <file>`; mất quyền này thì CI báo `Permission denied`.
- Kiểm tra workflow ở máy: `docker run --rm -v "<repo>:/repo" -w /repo rhysd/actionlint:1.7.12`
- Khi thêm biến môi trường bắt buộc mới cho production, phải thêm nó vào `.env.example`, nếu không bước kiểm tra compose sẽ fail.

## Database và deploy

- **Dev:** PostgreSQL chạy trong container Docker `cms-dev-postgres-1` trên máy dev (`localhost:5432`, volume `cms-dev_pgdata`). Dữ liệu dev không đi theo khi deploy; production có database riêng, Flyway tự tạo bảng.
- **Dev, ảnh:** RustFS trong container `cms-dev-rustfs-1` (`localhost:9100`, volume `cms-dev_rustfs-data`, bucket `cms-media`; test dùng `cms-media-test`).
- **Production (đã chọn):** một VPS Linux chạy `deploy/docker-compose.yml`. Caddy (HTTPS + file tĩnh frontend + proxy `/api`), Spring Boot, PostgreSQL và RustFS nằm chung một máy. Không mở cổng Postgres hay RustFS ra ngoài.
- **Backup:** `deploy/backup.sh` tạo 2 file: `cms-db-*.sql.gz` (pg_dump) và `cms-media-*.tar.gz` (thư mục dữ liệu RustFS). Cách restore ghi ở đầu script (đã thử: xóa sạch RustFS rồi restore, ảnh đọc lại trùng từng byte).
- **Không deploy lên Vercel** nguyên dự án: Vercel không chạy được server Spring Boot hay PostgreSQL. Nếu sau này đưa riêng frontend lên Vercel thì cần:
  - `frontend/vercel.json` rewrite `/api/*` sang URL backend, và các đường dẫn còn lại về `/index.html` (fallback cho SPA);
  - đặt Root Directory là `frontend`;
  - backend và database vẫn phải chạy ở nơi khác.
- Repo: https://github.com/NT101-lc/CafePlace (nhánh `main`).

## Cấu hình

- Profile: `dev` (mặc định, giá trị mặc định khớp `docker-compose.dev.yml`), `prod` (mọi giá trị lấy từ biến môi trường, không có mặc định), `test` (DB `cms_test`).
- Biến môi trường: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` (≥ 32 byte), `JWT_TTL` (mặc định `7d`), `PORT`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` (mặc định `cms-media`), `S3_REGION`; production thêm `DOMAIN`, `DB_NAME`. Xem `.env.example`.

## API hiện có

- `GET /api/health` (công khai): `{status, database}`
- `POST /api/auth/register` (công khai): tạo quán + tài khoản OWNER, trả `{token, expiresInSeconds, user}`
- `POST /api/auth/login` (công khai): username không phân biệt hoa thường
- `GET /api/menu-items`: menu của quán, xếp theo nhóm rồi tên (mọi vai trò)
- `POST /api/menu-items`, `PUT /api/menu-items/{id}`, `DELETE /api/menu-items/{id}`: chỉ OWNER. Body `{name, category?, price, available?}`; `category` để trống thì lưu null (UI hiện là "Khác").
- `PATCH /api/menu-items/{id}/availability` `{available}`: báo hết / mở bán lại (mọi vai trò)
- `PUT /api/menu-items/{id}/image` (body: file ảnh thô, Content-Type ảnh, ≤ 2MB), `DELETE /api/menu-items/{id}/image`: chỉ OWNER. Món trả về có `imageUrl` (hoặc null).
- `GET /api/menu-categories`: nhóm theo thứ tự hiển thị `[{id, name, sortOrder}]` (mọi vai trò)
- `PUT /api/menu-categories/order` `{ids: [...]}`: chỉ OWNER, phải gửi đủ mọi nhóm
- `GET /api/media/menu/{shopId}/{uuid}.{webp|jpg|png}` (công khai): ảnh món
- Mọi đường dẫn khác cần header `Authorization: Bearer <token>`. JWT chứa `sub` (userId), `shop_id`, `role` (`OWNER`/`STAFF` → authority `ROLE_OWNER`/`ROLE_STAFF`).
