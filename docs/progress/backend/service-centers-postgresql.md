# Chuyển trung tâm bảo hành sang PostgreSQL

Ngày: **25/10/2026**. Trạng thái: **HOÀN THÀNH yêu cầu bổ sung sau FE-07**.

## 1. Phạm vi đã được giao

Sinh viên yêu cầu lưu danh mục trung tâm trong PostgreSQL, dùng tài khoản kết nối đã cung cấp và cập nhật mã đọc trung tâm từ DB. Khi làm rõ, sinh viên chọn **chuyển hai trung tâm hiện có trước**, chưa nạp sáu trung tâm CSV. Đã dùng `.env`/tài khoản PostgreSQL và credential ứng dụng hiện có, không tạo lại password hoặc thay quyền DB.

- **SOURCE:** [README dataset](../../CDTN1_Mekong%20Mobile_Dataset%20Smart%20CRM/dataset/README.md) — Mục4/5: danh mục trung tâm liên quan SE/L2; không kéo toàn bộ dataset vào phạm vi cá nhân.
- **DESIGN:** thay phần centers của DEP-A theo yêu cầu mới; giữ FR01/05/06, QT-14 và ma trận quyền theo [SRS](../../srs.md), [contract](../../api-contract-l2.md), [decision log](decision-log.md). Không thêm QT/FR hoặc module phân công/kho.
- **IMPLEMENTATION:** migration003 đã áp dụng trên database `mekong-mobile-l2`; repository đọc trung tâm, auth kiểm trạng thái DB từng login/request, E08 recheck trong transaction. Kết quả thật ở [minh chứng](../../tests/backend/service-centers/verification.md).

## 2. CSDL hiện tại

```text
service_center
  center_id    BIGINT PRIMARY KEY CHECK > 0
  center_name  VARCHAR(120) NOT NULL, không rỗng
  is_active    BOOLEAN NOT NULL DEFAULT true

customer.center_id ──FK/RESTRICT──> service_center.center_id
ticket.center_id   ──FK/RESTRICT──> service_center.center_id
```

| center_id | center_name | is_active |
| --- | --- | --- |
|1|Trung tâm demo A|true|
|2|Trung tâm demo B|true|

Migration `003_service_centers.sql` chuyển đúng hai bản ghi đã xác minh từ cấu hình cũ, giữ ID/tên/trạng thái và thêm hai FK validated. Không đổi001/002 đã apply, không sửa customer/ticket/history/snapshot hoặc dùng seed để thay dữ liệu cũ. Chạy migration lần hai trả `applied_versions: []`; không ghi đè tên/trạng thái đã sửa trong DB.

Số bảng hiện tại: **sáu bảng lõi + một danh mục phụ thuộc + một bảng migration kỹ thuật**. Đây là thay đổi thiết kế được sinh viên giao, có lý do/truy vết tại TD-22; không mở rộng L2 thành toàn CRM. [DDL thiết kế](../../schema.sql) đã đồng bộ và được chạy thử trong schema cách ly,7 bảng dữ liệu/7 FK đạt.

## 3. Mã nguồn đã cập nhật

| File/nhóm, tương đối từ root | Nội dung |
| --- | --- |
| `src/backend/migrations/003_service_centers.sql` | Tạo bảng, chuyển hai trung tâm, FK customer/ticket |
| `src/backend/src/repositories/service-centers.repository.ts` | SQL tham số hóa list/isActive; tùy chọn SHARE lock |
| `src/backend/src/reference-config.ts` | `loadReference(file,pool)` đọc centers từ DB; validate runtime/membership và tham chiếu lịch sử; không fallback centers từ JSON |
| `src/backend/config/reference.demo.json` | Version2 chỉ còn products/accounts; account/membership/product giữ nguyên giá trị |
| `src/backend/src/auth.ts`, `foundation.ts` | Factory `createDatabaseAuth` kiểm DB lúc login và mỗi request; authenticate async, kiểm lại TTL/Map sau SQL |
| `src/backend/src/services/tickets.service.ts` | Bỏ dependency config của service; E08 kiểm/giữ khóa SHARE trung tâm trước customer/device/category trong transaction |
| `src/backend/src/cli.ts`, `compose-start.ts`, `seed.ts` | Migrate trước đọc DB/credential; seed kiểm hai trung tâm từ DB, không upsert/ghi đè danh mục |
| Server, manual helper và UI harness | Cập nhật factory/loadReference; harness có trung tâm3 chỉ trong schema test cho tài khoản rỗng; fingerprint bảo vệ thêm service_center |
| Unit/HTTP/PG tests | Giữ kiểm nghiệp vụ cũ; async auth, schema8 bảng/7 FK, cấu hình fixture; thêm2 unit và7 ca PG trung tâm |
| `src/backend/scripts/verify-center-migration.ts` | Bằng chứng trước/sau: hash/count sáu bảng lõi, sequence, registry và FK; không reset dữ liệu |
| README/kiến trúc/mapping/decision log/TD-22 | Phân biệt baseline cũ với thiết kế hiện tại và hướng dẫn chạy mới |

Các đối tượng `reference.centers` trong RAM là kết quả đã đọc từ DB; trường centers không còn trong tệp cấu hình runtime. Unit tests có fixture trung tâm để không cần DB, còn server/harness và PG tests dùng `createDatabaseAuth` đọc repository SQL thật. Product/account/membership vẫn config theo phạm vi đã chốt; chưa chuyển các dependency đó sang bảng.

Tên/membership được kiểm/nạp khi startup; trạng thái hoạt động được truy vấn mỗi login/request. Trung tâm ngừng làm login trả401 và token hiện có bị từ chối/thu hồi khi sử dụng; hoạt động lại cần login mới nếu token đã bị thu hồi. DB không truy cập được không dùng config cũ để cho qua. Sau await SQL, auth kiểm lại TTL và phiên còn tồn tại, tránh chấp nhận token đã hết hạn/đóng trong lúc chờ.

E08 kiểm lại trạng thái trung tâm ngay trong transaction và giữ SHARE lock trước các khóa cũ. Không đưa SQL vào route hoặc tính luật SLA/bảo hành tại repository/frontend. Việc đổi tên trung tâm không làm seed/migration khôi phục tên demo.

## 4. Bảo toàn database đang dùng

| Bảng lõi | Trước | Sau | SHA-256 toàn bộ hàng |
| --- | --- | --- | --- |
| customer |30|30|Khớp|
| device |30|30|Khớp|
| issue_category |6|6|Khớp|
| ticket |200|200|Khớp|
| ticket_status_log |200|200|Khớp|
| ticket_communication |30|30|Khớp|

Tất cả sequence giữ nguyên so với trước, kể cả sequence mã phiếu chưa được gọi. Registry001/002 giữ đúng name/checksum; chỉ thêm version3. Hai FK trung tâm được validated. [db-before.json](../../tests/backend/service-centers/db-before.json) và [db-after.json](../../tests/backend/service-centers/db-after.json) ghi bằng chứng; đã kiểm lại sau toàn bộ regression, không chỉ ngay sau migration.

Login bằng password demo cũ và đọc customer/catalog/queue trên DB thật đã PASS, không tạo thêm dữ liệu tại public. Root regression/UI tạo và dọn schema riêng, kiểm fingerprint cả service_center/public. Các CSV, nguồn, API/SRS, frontend, dependency/lockfile, migration cũ và minh chứng trước được bảo toàn theo [audit](../../tests/backend/service-centers/file-audit.json).

## 5. Kiểm chứng thực tế

| Lệnh/nhóm | Kết quả |
| --- | --- |
| Typecheck +7 ca nâng cấp trung tâm trong schema riêng | PASS; có ca migration lỗi FK rollback nguyên tử trước khi apply DB thật |
| `npm --prefix src/backend run db:migrate` | PASS, apply[3]; chạy lại[] |
| `node --env-file=.env scripts/verify-center-migration.ts after` tại backend | PASS, `CENTER_MIGRATION_DATA_PRESERVED` |
| `npm test` từ root, cấu hình cuối v2 | PASS, exit0:96 backend unit/HTTP,103 PostgreSQL (97 ca +6 nhóm cha),45 client,53 UI trong1,8 phút; typecheck/lint/build hai phần đạt |
| DDL skeleton trong schema trống riêng | PASS,7 bảng dữ liệu/7 FK |
| Login/API read-only bằng credential cũ trên DB đã nâng cấp | PASS |
| Compose mới + API E01–E13 + UI production | PASS, ba healthy; config v2 không centers, table có hai center |
| Compose restart và đọc lại receipt/snapshot/history | PASS, phiên cũ401, login lại và dữ liệu giữ nguyên |

Bảy ca SC-I01–07 kiểm rollback, nâng cấp dữ liệu có sẵn, FK/CHECK, đọc tên từ SQL, seed/migration lặp, ngừng/hoạt động lại và membership sai. Hai unit bổ sung kiểm token bị thu hồi khi trung tâm ngừng và hết hạn trong lúc query DB. Bộ SC tự được đăng ký bởi `tests/postgres.test.ts`, nên giữ nguyên package/scripts/lockfile mà root test vẫn chạy đủ.

NFR01 trong regression mới đạt100/100 dưới1500ms trên200 phiếu, p95≈48,4ms/max49ms. NFR02 chín request trái quyền bị từ chối, fingerprint8 bảng mỗi lượt khớp. Đây là phép kiểm local hữu hạn. Chi tiết log, mẫu đo và các lần sửa assertion tại [verification.md](../../tests/backend/service-centers/verification.md).

## 6. Cách dùng sau thay đổi và giới hạn

Trên database hiện tại migration đã chạy xong. Nếu backend đang dùng tiến trình cũ, khởi động lại bằng `npm run backend` từ root; frontend vẫn `npm run frontend`. Tài khoản/password hiện có tiếp tục dùng được, không tạo lại credential.

Môi trường khác đang ở001/002: cập nhật mã, chạy `npm --prefix src/backend run db:migrate`, sau đó restart backend. Môi trường mới: cấu hình → db:check → db:migrate → credentials:setup nếu chưa có → db:seed → chạy. Compose tự dùng thứ tự mới. Không chạy DDL skeleton trực tiếp lên DB có dữ liệu.

- Chưa nhập sáu trung tâm CSV hoặc dataset khác; center_code/thành phố chưa thêm vì bước này chỉ chuyển đúng ba trường của hai trung tâm hiện có.
- Chưa có API/UI quản trị hay endpoint trả tên trung tâm. A01/E01–E13 và frontend giữ nguyên, UI tiếp tục hiển thị ID theo contract. Trọng tâm là đổi nguồn dữ liệu/kiểm tra tham chiếu.
- Startup giữ invariant cũ: account còn hoạt động không được có active center đang ngừng, membership phải tham chiếu trung tâm tồn tại. Nếu chỉnh trạng thái DB rồi restart, cần xử lý account tương ứng hoặc bật lại trung tâm; không tự đổi quyền người dùng. SC-I05 đã kiểm hành vi này.
- Migration003 áp dụng cho baseline hai trung tâm demo đã xác minh của dự án. Không tự remap cấu hình riêng hoặc ID nguồn khác; import dataset cần bước riêng.
- Compose test `mekong-centers-20261025` đã down, giữ volume/credential test riêng. Không chạy lại full verify container cho thay đổi này; đã có regression đầy đủ local và smoke API/UI/restart trên image Linux mới.
- Không dùng Git, không sửa disclosure hoặc xác nhận sinh viên đã tự kiểm chứng. Có thể bổ sung khai báo AI: Codex hỗ trợ migration/repository/auth/tests/docs trung tâm; kiểm chứng theo báo cáo này; sinh viên cần đọc/hiểu và tự xác nhận phần mình đã chạy.

Dừng đúng yêu cầu chuyển hai trung tâm; không tự tiến hành làm sạch/import dataset.
