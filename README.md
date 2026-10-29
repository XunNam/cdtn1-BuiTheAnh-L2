# Mekong Mobile — Tiếp nhận và phân loại yêu cầu bảo hành (L2)

| Thông tin | Nội dung |
| --- | --- |
| Sinh viên | **Bùi Thế Anh** |
| MSSV | **2374802010009** |
| Chuyên ngành / Track | **Software Engineering (SE)** |
| Học phần | **Chuyên đề tốt nghiệp 1** |
| Học kỳ / Năm học | **HK1, 2026–2027** |
| Case study | **Smart CRM — Mekong Mobile** |
| Luồng nghiệp vụ | **L2 — Tiếp nhận và phân loại yêu cầu bảo hành** |

## 1. Mục tiêu và phạm vi mã nguồn

Prototype giúp nhân viên tra cứu/tạo khách hàng, ghi nhận thiết bị và mô tả lỗi, chọn nhóm sự cố và mức ưu tiên để tạo phiếu bảo hành **Mới**. Backend kiểm tra bảo hành, tính hạn cam kết và lưu lịch sử; quản lý phê duyệt trường hợp thiếu ngày mua, nhân viên ghi trao đổi với khách hàng. Giao diện đăng nhập và ba màn hình nghiệp vụ dùng API/PostgreSQL thật. Phạm vi kết thúc ở tiếp nhận và phê duyệt ngoại lệ; chưa triển khai phân công, sửa chữa, kho hoặc thanh toán.

Phạm vi đưa lên GitHub gồm mã nguồn L2, migration/seed, cấu hình chạy local/Docker, lockfile, README và mã kiểm thử L2 cùng fixture cần thiết. Tài liệu học phần, kế hoạch, báo cáo, ảnh minh chứng, dataset gốc, công cụ chuyển đổi/import CSV và cấu hình cá nhân được giữ cục bộ, loại khỏi Git bằng `.gitignore`.

Ứng dụng khởi tạo dữ liệu mẫu bằng seed, không cần dataset bên ngoài để chạy. Database đã có trên máy phát triển và Docker là hai môi trường riêng; dữ liệu không được đóng gói cùng mã nguồn và không tự đồng bộ. Việc loại file khỏi Git không thay đổi database hoặc credential hiện có.

## 2. Nên chọn Docker hay chạy trực tiếp trên Windows?

| Nhu cầu | Cách phù hợp | Điểm cần biết |
| --- | --- | --- |
| Mở ứng dụng dùng thử, trình diễn hoặc dựng trên máy khác | **Docker** | Chạy frontend + backend + PostgreSQL cùng lúc; không cần cài Node/PostgreSQL riêng trên host |
| Sửa code, xem log và kiểm tra từng phần khi phát triển | **Windows trực tiếp** | Hai terminal; backend/frontend theo dõi thay đổi code. Máy phát triển hiện tại đã có cấu hình và DB |

Hai cách mặc định cùng dùng cổng **3000/3001**, nên chọn một cách tại một thời điểm. Database và mật khẩu của Docker **riêng** với Windows; dữ liệu không tự đồng bộ giữa hai môi trường.

> Mọi lệnh bên dưới chạy bằng **PowerShell tại thư mục gốc project**, nơi có `package.json` và `compose.yaml`. Mở terminal trong thư mục project trước khi sao chép lệnh.

## 3. Chạy nhanh trên Windows — máy đã được thiết lập

**Bước 1 —** Bảo đảm dịch vụ PostgreSQL trên Windows đang chạy. Giữ nguyên `.env` và credential hiện có.

**Bước 2 —** Mở terminal thứ nhất, chạy backend:

```powershell
npm run backend
```

Đợi thông báo **“Backend L2 đã khởi động”** và giữ terminal này mở.

**Bước 3 —** Mở terminal thứ hai tại cùng thư mục project, chạy frontend:

```powershell
npm run frontend
```

**Bước 4 —** Mở [http://localhost:3000](http://localhost:3000). Lấy mật khẩu từ `src/backend/.private/demo-passwords.local.json` bằng trình soạn thảo; chọn tài khoản trong mục 6.

Để dừng, bấm **Ctrl+C trong cả hai terminal**. Hiện chưa có lệnh npm chung để chạy đồng thời hai phần; `npm run dev` ở root chưa được khai báo.

<details>
<summary><strong>Cài Windows lần đầu hoặc dựng lại trên máy mới — mở phần này</strong></summary>

### Bước 1 — Chuẩn bị và cài dependency

Cần **Node.js ≥24.18.0**, npm và PostgreSQL. Chuẩn bị sẵn database `mekong-mobile-l2` cùng tài khoản có quyền CONNECT, USAGE/CREATE schema và quyền quản lý các bảng/sequence migration; kiểm thử cần thêm CREATE schema trong database. Ứng dụng không tự tạo database hoặc cấp quyền.

```powershell
npm run setup
```

### Bước 2 — Tạo cấu hình nếu chưa có

```powershell
if (-not (Test-Path src/backend/.env)) {
    Copy-Item src/backend/.env.example src/backend/.env
}
if (-not (Test-Path src/frontend/.env.local)) {
    Copy-Item src/frontend/.env.example src/frontend/.env.local
}
```

Mở `src/backend/.env`, điền `DB_USER` và `DB_PASSWORD` do người vận hành cấp; giữ `DB_NAME=mekong-mobile-l2`, `DB_HOST=localhost`, `DB_PORT=5432`, `PORT=3001` nếu dùng cấu hình mặc định. Không thay file đã có bằng bản mẫu.

Frontend mặc định dùng `NEXT_PUBLIC_L2_API_BASE=/api` và `L2_API_PROXY_TARGET=http://127.0.0.1:3001`. Không điền thông tin DB vào biến `NEXT_PUBLIC_*`.

### Bước 3 — Kiểm DB, migration, credential và seed

Chạy từng lệnh theo thứ tự, chỉ tiếp tục khi lệnh trước thành công:

```powershell
npm --prefix src/backend run db:check
npm --prefix src/backend run db:migrate
```

Chỉ tạo password demo khi chưa có credential:

```powershell
if (-not (Test-Path src/backend/.private/credentials.json)) {
    npm --prefix src/backend run credentials:setup
}
```

Sau đó nạp dữ liệu mẫu:

```powershell
npm --prefix src/backend run db:seed
```

**Migration phải chạy trước tạo credential**, vì danh mục trung tâm nằm trong DB. Không tạo lại hoặc xóa credential hiện có. Migration/seed chạy lại không nhân đôi bản ghi hoặc ghi đè chỉnh sửa vận hành; dùng các lệnh migration thay vì chạy DDL thủ công lên DB đã có bảng.

### Bước 4 — Mở hai terminal và chạy

Làm theo mục 3: `npm run backend` ở terminal 1, `npm run frontend` ở terminal 2, rồi mở [localhost:3000](http://localhost:3000).

Nếu chỉ cập nhật từ bản có migration001/002/003, chạy `npm --prefix src/backend run db:migrate` rồi khởi động lại backend; không cần tạo lại password hoặc seed để cập nhật cấu trúc. Giữ toàn bộ migration hiện có, bao gồm `004_customer_email.sql`, để tương thích database đã khởi tạo; migration không tự import CSV.

</details>

## 4. Chạy bằng Docker — cả hệ thống cùng lúc

### Bước 1 — Mở Docker Desktop và chuẩn bị cấu hình

Đợi Docker Desktop sẵn sàng. Tạo file cấu hình riêng nếu chưa có:

```powershell
if (-not (Test-Path .env.compose)) {
    Copy-Item .env.example .env.compose
}
```

Mở `.env.compose` bằng trình soạn thảo và thay hai placeholder:

| Biến | Điền gì? |
| --- | --- |
| `COMPOSE_DB_USER` | Tên tài khoản PostgreSQL riêng cho môi trường Docker |
| `COMPOSE_DB_PASSWORD` | Mật khẩu mới, riêng cho Docker; thay toàn bộ placeholder gồm dấu `< >` |
| `L2_FRONTEND_PORT` | Giữ `3000` nếu cổng trống |
| `L2_BACKEND_PORT` | Giữ `3001` nếu cổng trống |

Giữ cấu hình Docker riêng với `src/backend/.env`. Các file chứa giá trị thật đã được ignore.

### Bước 2 — Dựng và chạy frontend + backend + database

```powershell
docker compose --env-file .env.compose up --build -d --wait
```

Lần đầu cần mạng để tải image/dependency. Đợi đủ ba dịch vụ **healthy**; lệnh thành công trả lại dấu nhắc terminal. Compose tự chạy migration → đọc trung tâm từ DB → tạo credential nếu chưa có → seed → backend/frontend.

### Bước 3 — Lấy mật khẩu demo của Docker

Lần đầu chạy, sao chép file password demo ra thư mục project:

```powershell
docker compose --env-file .env.compose cp backend:/app/.private/demo-passwords.local.json demo-passwords.local.json
```

Mở `demo-passwords.local.json` bằng trình soạn thảo để xem mật khẩu cho username tương ứng. Đây là password **đăng nhập ứng dụng**, khác `COMPOSE_DB_PASSWORD` là password **kết nối PostgreSQL**. Không đưa các file này vào Git hoặc ảnh minh chứng.

### Bước 4 — Mở ứng dụng

Truy cập [http://localhost:3000](http://localhost:3000), chọn tài khoản trong mục 6 và thử luồng nghiệp vụ. Nếu đã đổi `L2_FRONTEND_PORT`, dùng cổng mới trên trình duyệt.

Sau khi chuẩn bị cấu hình, chỉ cần hai lệnh ở bước 2–3 để dựng hệ thống và lấy credential. Các lần sau chạy lại lệnh `up` ở bước 2; password/dữ liệu giữ trong volume.

| Muốn làm gì? | Lệnh tại root |
| --- | --- |
| Xem trạng thái | `docker compose --env-file .env.compose ps` |
| Xem log khi có lỗi | `docker compose --env-file .env.compose logs --tail 80 backend frontend database` |
| Dừng hệ thống, giữ dữ liệu | `docker compose --env-file .env.compose down` |
| Chạy lại hoặc cập nhật bản build | `docker compose --env-file .env.compose up --build -d --wait` |

Không thêm `-v` vào lệnh `down` khi muốn giữ database/password. Database Docker không publish cổng PostgreSQL ra Windows; frontend/backend chỉ publish HTTP trên loopback. Backend HTTP mặc định tại [localhost:3001/api](http://localhost:3001/api).

## 5. Dữ liệu mẫu và khác biệt giữa hai cách chạy

Môi trường mới được khởi tạo với **2 trung tâm, 30 khách hàng, 30 thiết bị, 6 nhóm sự cố, 200 phiếu, 200 log trạng thái và 30 trao đổi**. Dữ liệu tăng thêm khi thao tác được giữ trong PostgreSQL; không cần import bộ CSV bên ngoài để sử dụng prototype.

Database Windows đã có dữ liệu vẫn tiếp tục dùng dữ liệu đó. Clone mới và Docker không tự có tập dữ liệu đã nhập trên một máy khác.

| Nội dung | Windows trực tiếp | Docker |
| --- | --- | --- |
| PostgreSQL | Dịch vụ PostgreSQL đã cài trên Windows | Container `database`, volume `pgdata` |
| Cấu hình DB | `src/backend/.env` | `.env.compose` |
| Password đăng nhập ứng dụng | `src/backend/.private/demo-passwords.local.json` | File xuất `demo-passwords.local.json` ở root |
| Khi sửa code | Các tiến trình dev theo dõi thay đổi | Chạy lại `up --build` để cập nhật image |
| Khi dừng/chạy lại | Giữ database local | Giữ volume nếu không xóa volume |

Trung tâm được lưu trong `service_center`, có FK từ customer/ticket. Products/accounts/membership dùng config `src/backend/config/reference.demo.json`; file này cần được giữ cùng mã nguồn để seed, đăng nhập và chọn thiết bị.

## 6. Đăng nhập và thử một luồng hoàn chỉnh

| Username | Vai trò | Phạm vi |
| --- | --- | --- |
| `nv_demo_a` | Nhân viên tiếp nhận | Trung tâm 1 |
| `nv_demo_b` | Nhân viên tiếp nhận | Trung tâm 2 |
| `ql_demo_a` | Quản lý | Trung tâm 1 |
| `ql_demo_ab` | Quản lý | Trung tâm 1 và 2 |

Mật khẩu xem đúng file của môi trường đang chạy ở mục 5; không có password chung ghi trong README.

1. Đăng nhập bằng **`nv_demo_a`** → màn hình tiếp nhận.
2. Tra số điện thoại; nếu chưa có, tạo khách hàng rồi chọn/tạo thiết bị với serial mới.
3. Để trống ngày mua để thử nhánh **chưa xác minh bảo hành**; nhập mô tả lỗi, chọn nhóm sự cố và mức ưu tiên.
4. Tạo phiếu → xem mã/ID/hạn cam kết → mở chi tiết và ghi một trao đổi.
5. Ghi nhớ mã/ID phiếu, đăng xuất rồi đăng nhập **`ql_demo_a`**.
6. Mở phiếu trong hàng chờ và phê duyệt. Danh sách xếp **tiếp nhận cũ trước**, phiếu mới có thể ở trang cuối.
7. Kiểm tra kết quả: đã phê duyệt, phiếu vẫn **Mới**, snapshot bảo hành và hạn cam kết giữ nguyên.

Đường dẫn chính: `/login`, `/intake`, `/tickets`, `/tickets/{ticketId}`. Nhân viên mở phiếu bằng ID; quản lý có hàng chờ. Reload/F5, tab mới hoặc backend restart cần đăng nhập lại vì phiên chỉ lưu trong RAM. Link/menu bên trong ứng dụng giữ phiên.

## 7. Kiểm thử L2

### Windows

Chuẩn bị Chromium một lần sau khi đã cài dependency:

```powershell
npm --prefix src/frontend exec -- playwright install chromium
```

Để lưu kết quả UI vào thư mục mới, đặt đường dẫn đầu ra trước khi chạy:

```powershell
$env:L2_UI_OUTPUT_DIR = Join-Path (Get-Location) ("docs/tests/manual-runs/" + (Get-Date -Format "yyyyMMdd-HHmmss"))
```

Lệnh kiểm thử đầy đủ từ root:

Trên checkout mới, chạy `npm --prefix src/frontend run build` một lần để sinh `next-env.d.ts` và các kiểu route trước bước typecheck. Các file sinh tự động này không đưa vào Git.

```powershell
npm test
```

Lệnh chạy backend typecheck/unit/HTTP/PostgreSQL/build → frontend typecheck/lint/client/build → kiểm thử trình duyệt. Test tự tạo/dọn schema, credential và cổng riêng; không cần nạp dataset vào public. Không gọi Playwright trực tiếp khi thiếu fixture của harness. Sau build, có thể chạy UI riêng bằng `npm run test:ui`. Trên Linux, cài Chromium bằng `npm --prefix src/frontend exec -- playwright install --with-deps chromium`.

Giữ `src/backend/tests/fixtures/reference.base.json`: các test L2 dùng fixture nhỏ này, độc lập với catalog vận hành. Các lệnh và test riêng của bộ import CSV không thuộc bộ kiểm thử trong repository. Ảnh/log do test tạo nằm trong thư mục được ignore.

### Docker

Sau khi chuẩn bị `.env.compose`, chạy toàn bộ bộ kiểm thử trong container:

```powershell
docker compose --env-file .env.compose --profile checks run --build --rm verify
```

Lần đầu tải Chromium/thư viện hệ thống. Kết quả hiện trong terminal; container verify dùng schema riêng và được xóa sau khi chạy.

## 8. Cấu trúc và môi trường dự án

```text
src/backend/       API Express, service, repository, migration, seed, tests
src/frontend/      Giao diện Next.js/React, API client, kiểm thử trình duyệt
scripts/test-all.mjs Lệnh kiểm thử tổng hợp L2
compose.yaml       Ba dịch vụ ứng dụng và profile kiểm thử
Dockerfile         Build các image backend/frontend/verify
.env.example       Cấu hình mẫu dành cho Compose
```

| Thành phần | Phiên bản / cấu hình |
| --- | --- |
| Máy phát triển | Windows 11, Node.js 24.18.0, npm 12.1.0, PostgreSQL 18.6 |
| Frontend | Next.js 16.4.2, React 19.3.0, TypeScript |
| Backend | Express 5.3.0, TypeScript, driver `pg` |
| Đóng gói | Docker Engine 29.9.2, Compose 5.6.1; Node 24 bookworm-slim, PostgreSQL 18 alpine |

Các phiên bản trong ví dụ slide học phần không thay thế yêu cầu runtime thực tế của repo; dùng lockfile hiện có, không tự nâng/hạ dependency khi làm theo README.

## 9. Xử lý nhanh khi chưa chạy được

| Hiện tượng | Kiểm tra / xử lý |
| --- | --- |
| Cổng 3000/3001 đang được dùng | Dừng cách chạy còn lại. Với Docker có thể đổi `L2_FRONTEND_PORT=3010`, `L2_BACKEND_PORT=3011` trong `.env.compose`, chạy lại `up` và mở `localhost:3010` |
| Docker không kết nối daemon | Mở Docker Desktop và đợi sẵn sàng rồi chạy lại |
| Docker báo cần `.env.compose` hoặc placeholder | Hoàn tất bước 1 mục 4; điền user/password mới và lưu file |
| Build Docker lỗi mạng khi tải package/image | Kiểm kết nối mạng, đọc log rồi chạy lại lệnh `up --build`; không đổi lockfile để né lỗi tải |
| Backend local lỗi kết nối DB | Kiểm PostgreSQL đang chạy, `.env` đúng DB/tài khoản/cổng; chạy `npm --prefix src/backend run db:check` |
| Backend báo còn migration | Chạy `npm --prefix src/backend run db:migrate`, sau đó khởi động lại backend |
| Đăng nhập sai sau khi chuyển Windows/Docker | Xem đúng file password của môi trường ở mục 5; password DB không phải password đăng nhập ứng dụng |
| Không thấy dữ liệu vừa tạo khi đổi cách chạy | Hai database riêng; quay lại đúng môi trường đã tạo dữ liệu |
| F5 bị yêu cầu đăng nhập lại | Đây là giới hạn phiên RAM hiện tại; đăng nhập lại, dùng menu để chuyển trang trong cùng phiên |

## 10. Giới hạn

Backend luôn kiểm role/center. Hết hạn bảo hành vẫn có thể được tiếp nhận theo thiết kế, không đồng nghĩa sửa chữa miễn phí. POST mất phản hồi không tự gửi lại; E08 chưa có idempotency/tra cứu chắc chắn theo bản nhập. Prototype chạy local, chưa có refresh/revoke token, quản trị tài khoản/trung tâm hoặc triển khai production. Việc có mã nguồn và hướng dẫn chạy không đồng nghĩa đã nghiệm thu hoặc hoàn thành toàn bộ rubric học phần.
