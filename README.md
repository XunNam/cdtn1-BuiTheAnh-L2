# Mekong Mobile — Prototype CĐTN1 L2

Prototype local tiếp nhận và phân loại yêu cầu bảo hành, track Software Engineering. Nhân viên tra cứu/tạo khách hàng, ghi thiết bị, kiểm tra bảo hành, chọn nhóm lỗi và ưu tiên để tạo phiếu Mới. Quản lý duyệt trường hợp chưa xác minh; nhân viên lưu trao đổi và lịch sử. PostgreSQL lưu sáu bảng nghiệp vụ lõi và danh mục `service_center`; products/accounts/membership dùng config. Trung tâm được chuyển sang PostgreSQL theo yêu cầu bổ sung sau FE-07; xem [báo cáo](docs/progress/backend/service-centers-postgresql.md). Không mở rộng sửa chữa, phân công, kho, thanh toán hoặc production.

## Môi trường đã kiểm thử

Windows 11, Node.js 24.18.0, npm 12.1.0, PostgreSQL 18.6; Next.js 16.4.2, React 19.3.0, Express 5.3.0. Docker Engine 29.9.2, Compose v5.6.1; Node 24 bookworm-slim và PostgreSQL 18 alpine. Phiên bản container và số liệu lịch sử: [Phase 6](docs/progress/backend/phase-06.md). FE-07 đã kiểm lại với Node container24.22.1/PostgreSQL18.6, full regression và UI production: [báo cáo FE-07](docs/progress/frontend/phase-07.md). Máy chạy Docker không cần cài Node/PostgreSQL riêng.

## Docker: toàn bộ giao diện, API và CSDL

Chuẩn bị Docker đang hoạt động. Sao chép `.env.example` thành `.env.compose`; thay placeholder COMPOSE_DB_USER/COMPOSE_DB_PASSWORD bằng thông tin **mới, riêng cho Compose**. Có thể đổi L2_FRONTEND_PORT/L2_BACKEND_PORT nếu cổng 3000/3001 bận. Đây là bước chuẩn bị cấu hình trước NFR03; tệp thật bị ignore. Không dùng database/credential development. Database Compose không publish cổng PostgreSQL ra host.

Hai lệnh từ root sau chuẩn bị:

```powershell
docker compose --env-file .env.compose up --build -d --wait
docker compose --env-file .env.compose cp backend:/app/.private/demo-passwords.local.json demo-passwords.local.json
```

Lệnh thứ nhất dựng và chờ ba dịch vụ healthy: preflight → migration version/checksum (gồm danh mục trung tâm) → credential mới nếu chưa có → seed → Backend → Frontend. Lệnh thứ hai xuất password demo riêng để mở cục bộ bằng trình soạn thảo; không in/chia sẻ nội dung. `demo-passwords.local.json` bị ignore. Mở [localhost:3000](http://localhost:3000), dùng username/password tương ứng: nv_demo_a là nhân viên trung tâm 1, ql_demo_a quản lý trung tâm 1. Thay URL nếu đổi cổng. Không đặt password/token vào lệnh HTTP, ảnh hoặc log.

API ở [localhost:3001/api](http://localhost:3001/api); thiếu Bearer trả 401. Trình duyệt đi qua proxy cùng origin /api. Lệnh trạng thái tùy chọn:

```powershell
docker compose --env-file .env.compose ps
```

Dừng giữ volume:

```powershell
docker compose --env-file .env.compose down
```

Lần hai chạy lại đúng lệnh up. Migration/seed tự chạy lại, không nhân đôi/ghi đè chỉnh sửa vận hành/đổi credential. Bearer nằm trong process nên cần login lại. Không xóa volume để chữa lỗi; migration/checksum/config lỗi thì Backend không healthy.

Toàn bộ kiểm thử bằng **một lệnh**, lần đầu tải Chromium và thư viện hệ thống:

```powershell
docker compose --env-file .env.compose --profile checks run --build --rm verify
```

Test tự migrate/seed schema ngẫu nhiên, chỉ dọn schema của chính nó, không reset public hoặc cần dữ liệu cá nhân. Image verify có Node/Chromium và test đầy đủ Backend, Frontend, UI production.

## Local development

Cần Node/npm/PostgreSQL. Nếu đã có `src/backend/.env`, `src/backend/.private/credentials.json` và password demo thì giữ nguyên, bỏ qua tạo credential.

1. Cài đúng lockfile từ root:

```powershell
npm run setup
```

2. Sao chép `src/backend/.env.example` thành `src/backend/.env`. Điền DB_HOST=localhost, DB_PORT=5432, DB_NAME=mekong-mobile-l2, DB_USER/DB_PASSWORD do người vận hành cấp. Account cần CONNECT, USAGE/CREATE schema public và quyền trên bảng/sequence migration quản lý; test cần CREATE schema trong database này. Thiếu quyền phải nhờ chủ database cấp, ứng dụng không GRANT hoặc kết nối database khác.

3. Kiểm tra trước migration:

```powershell
npm --prefix src/backend run db:check
```

4. Migration, gồm chuyển hai trung tâm demo vào PostgreSQL:

```powershell
npm --prefix src/backend run db:migrate
```

5. Chỉ môi trường mới chưa có credential, tạo một lần **sau migration** vì cần kiểm trung tâm từ DB:

```powershell
npm --prefix src/backend run credentials:setup
```

Password demo chỉ ở `src/backend/.private/demo-passwords.local.json`. Không ghi đè tệp cũ.

6. Seed:

```powershell
npm --prefix src/backend run db:seed
```

Fixture v1 có 30 customer, 30 device, 6 category, 200 ticket, 200 status log, 30 communication. Seed lặp tạo 0 ticket, giữ dữ liệu vận hành; không reset/drop/sửa migration đã apply.

7. Sao chép `src/frontend/.env.example` thành `src/frontend/.env.local` nếu chưa có. NEXT_PUBLIC_L2_API_BASE=/api; L2_API_PROXY_TARGET=http://127.0.0.1:3001 chỉ dùng server, không chứa credential. Giữ cấu hình có sẵn nếu phù hợp.

8. Terminal Backend:

```powershell
npm run backend
```

9. Terminal Frontend:

```powershell
npm run frontend
```

Mở localhost:3000 và dùng credential demo local.

## Kiểm thử local bằng một lệnh

Chuẩn bị một lần sau setup:

```powershell
npm --prefix src/frontend exec -- playwright install chromium
```

Linux thay bằng `playwright install --with-deps chromium` để có thư viện hệ thống. PostgreSQL account cần CREATE schema test. Từ root:

```powershell
npm test
```

Script dừng với exit code khác 0 khi FAIL: Backend type-check/unit/HTTP/PG/build → Frontend type-check/lint/API client contract/build →53 test trình duyệt hiện tại. Mỗi schema tự có fixture; không cần seed public. UI production dùng cổng ngẫu nhiên/credential tạm riêng, kiểm Backend mất kết nối/phục hồi/hết phiên thật và dọn đúng tài nguyên đã tạo. Output mới mặc định tại `docs/tests/frontend/phase-07/`; giữ minh chứng các phase trước ở thư mục cũ. Harness có catalog/clock và trạng thái không còn được duyệt chỉ trong fixture test; không sửa config demo hoặc seed thật. Chạy riêng UI sau build:

```powershell
npm run test:ui
```

## Trình diễn

Nhân viên đăng nhập → `/intake`: tra số chưa có, tạo khách, chọn sản phẩm/serial mới ngay trong cùng màn hình; để trống ngày mua cho nhánh xác minh → chọn nhóm lỗi/ưu tiên/mô tả → kiểm tra tóm tắt → tạo phiếu → xem kết quả mã/ID/hạn trên màn hình → bấm “Mở chi tiết phiếu” đến `/tickets/{ID}` và lưu trao đổi. Có thể bấm “Tiếp nhận mới” để bắt đầu bản nhập mới. Đăng xuất → login quản lý → `/tickets` tìm phiếu trong hàng chờ phân trang cũ trước → mở chi tiết → duyệt. Phiếu vẫn Mới, hạn/snapshot giữ nguyên; prototype dừng ở L2. Hết bảo hành vẫn có thể tiếp nhận theo thiết kế đã chốt, không suy ra miễn phí.

FE-01–05 đã hoàn thiện nền tảng, intake và phần đọc phiếu; FE-06 hoàn thiện ghi trao đổi/phê duyệt với validation Unicode, xác nhận lưu, xử lý409 và phục hồi GET sau timeout. Đã lưu nhưng GET lỗi vẫn báo đã lưu; không tự POST lại. Quản lý giữ filter/page khi quay về, snapshot/SLA không tính lại khi duyệt. NV mở ID và không gọi E09; QL không có quyền intake hoặc ghi trao đổi. E08 mất phản hồi trước ID vẫn chưa tự tìm lại được vì API không có idempotency/tra cứu theo bản nhập. Link nội bộ giữ phiên RAM, reload/tab mới cần login lại. FE-07 đã hoàn thiện bố cục ba/hai/một cột cho intake, vị trí form trao đổi, focus/keyboard và hồi quy cuối. Cả bảy phase đã hoàn thành theo [kế hoạch](docs/plans/frontend-l2-implementation-plan.md); xem [bàn giao FE-07](docs/progress/frontend/phase-07.md) và [minh chứng](docs/tests/frontend/phase-07/verification.md). Chi tiết: [FE-01](docs/progress/frontend/phase-01.md), [FE-02](docs/progress/frontend/phase-02.md), [FE-03](docs/progress/frontend/phase-03.md), [FE-04](docs/progress/frontend/phase-04.md), [FE-05](docs/progress/frontend/phase-05.md), [FE-06](docs/progress/frontend/phase-06.md).

## Minh chứng và giới hạn

[Kiến trúc thực tế](docs/architecture-thuc-te.md), [12 case BT2](docs/tests/bt2-test-evidence.md), [NFR](docs/tests/nfr-evidence.md), [Phase 6](docs/progress/backend/phase-06.md), [contract](docs/api-contract-l2.md), [phụ lục login/CRUD](docs/api-contract-l2-extension.md), [thay đổi thiết kế](docs/thay-doi-thiet-ke.md), [dự thảo AI](docs/ai-disclosure.md).

Token chỉ ở RAM; refresh/restart/hết hạn cần login. HTTP chỉ dành loopback/local, chưa có cơ chế production/refresh token/quản trị account. Backend luôn kiểm role/center. Wireframe BT1 được thích ứng tối thiểu theo quyền E09 đã duyệt và ghi trong nhật ký. Commit/tag v0.2, quyền repo giảng viên và PDF nộp bài cần sinh viên tự xác nhận; không có tuyên bố đã nộp BT2.

## Cập nhật danh mục trung tâm sau FE-07

Đã có migration `003_service_centers.sql`: chuyển hai trung tâm demo ID1/2 sang `service_center`, thêm FK từ customer/ticket. Máy đã cài bản cũ chỉ cần chạy `npm --prefix src/backend run db:migrate` rồi khởi động lại backend; giữ nguyên `.env`, credential và dữ liệu. Không chạy lại DDL skeleton hoặc tạo lại password. Config reference version2 chỉ có products/accounts; trung tâm lấy từ PostgreSQL, trạng thái hoạt động kiểm lại khi login và mỗi request có phiên. Nếu ngừng trung tâm đang là active center của account còn hoạt động, cần xử lý cấu hình account trước lần khởi động tiếp theo; runtime từ chối phiên của trung tâm ngừng. Chưa có UI/API quản trị trung tâm hoặc import sáu trung tâm CSV.
