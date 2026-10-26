# Minh chứng chuyển trung tâm sang PostgreSQL

Ngày: **25/10/2026**. [Báo cáo](../../../progress/backend/service-centers-postgresql.md). Local Windows11/Node24.18.0/PostgreSQL18.6; Next16.4.2/React19.3.0/Chromium156.0.8078.4 theo runtime hiện có. Không dependency mới. Nguồn dữ liệu thật được thao tác chỉ là database đã cấu hình `mekong-mobile-l2` bằng tài khoản sẵn có.

## Lệnh và kết quả

| Lệnh/kiểm tra | Kết quả | Exit | Bằng chứng |
| --- | --- | --- | --- |
| `node --env-file=.env scripts/verify-center-migration.ts before` tại backend | PASS |0|[db-before.json](db-before.json), tạo trước migration |
| `node --env-file=.env --test tests/service-centers.postgres.test.ts` tại backend | PASS |0|[upgrade-test-run.txt](upgrade-test-run.txt):7 ca và1 nhóm cha |
| `npm run db:migrate` tại backend | PASS |0|[migration-run.txt](migration-run.txt):[3] |
| Chạy migration lần hai | PASS |0|[migration-rerun.txt](migration-rerun.txt):[] |
| `verify-center-migration.ts after`, ngay sau migration và sau hồi quy | PASS |0|[db-after.json](db-after.json), [preservation-final.txt](preservation-final.txt) |
| `npm test` từ root trên cấu hình cuối version2 | PASS |0|[regression-run.txt](regression-run.txt):96/103/45/53, không fail/skip |
| DDL thiết kế trong schema test trống | PASS |0|[ddl-verification.txt](ddl-verification.txt):7 bảng dữ liệu,7 FK |
| Login/API read-only với credential cũ | PASS |0|[local-api-smoke.txt](local-api-smoke.txt), không POST dữ liệu nghiệp vụ ở public |
| Compose up/build/wait mới | PASS |0|[compose-build-run.txt](compose-build-run.txt), [bản cuối](compose-final-build.txt) |
| Compose API E01–E13 | PASS |0|[compose-api-smoke.txt](compose-api-smoke.txt) |
| Compose UI production bản cuối | PASS |0|[compose-ui-final.txt](compose-ui-final.txt), [ảnh](compose-ui/compose-ui-detail.png) |
| Compose restart/token/persistence | PASS |0|[compose-restart.txt](compose-restart.txt) |
| Nguồn trung tâm DB trong image cuối | PASS |0|[compose-centers.json](compose-centers.json):configVersion2/configHasCenters=false,2 row, migration1/2/3 |
| Ba service healthy trước cleanup | PASS |0|[compose-status.json](compose-status.json) |
| Down đúng stack test, không xóa volume | PASS |0|[compose-stop.txt](compose-stop.txt) |
| Audit tệp/các phần giữ nguyên | Xem audit | |[file-audit.json](file-audit.json) |

Root `npm test` dùng `L2_UI_OUTPUT_DIR` trỏ vào `docs/tests/backend/service-centers/ui/` (đường dẫn tuyệt đối từ root) để giữ toàn bộ evidence FE-01–07. Harness truyền biến này cho browser qua môi trường có sẵn, không sửa frontend.103 PostgreSQL gồm97 ca/6 nhóm cha;53 UI mất1,8 phút. SC-I01–07 được import bởi postgres.test.ts nên vẫn chạy khi dùng script hiện hành.

## Kiểm tra mới và bảo toàn

| Ca | Assertion chính | Kết quả |
| --- | --- | --- |
| SC-I01 | Baseline001/002 có center không hợp lệ:003 lỗi FK, toàn migration rollback, giữ customer và registry |PASS|
| SC-I02 | Upgrade baseline có customer sang003: giữ row/ID, hai trung tâm đúng, hai FK validated, rerun[] |PASS|
| SC-I03 | Customer/ticket center lạ bị FK chặn, center đang được dùng không xóa được, ID/tên sai bị CHECK chặn |PASS|
| SC-I04 | Sửa tên SQL được loader đọc; migrate/seed lặp không ghi đè; JSON chứa centers bị từ chối |PASS|
| SC-I05 | DB inactive → request401/login401, token đã thu hồi không dùng lại sau active, login mới được; startup kiểm active account/center |PASS|
| SC-I06 | E08 dùng principal đã có nhưng DB inactive → ROLE_FORBIDDEN, ticket/log không đổi |PASS|
| SC-I07 | Membership trỏ center không có trong DB → CONFIGURATION_ERROR |PASS|
| Unit auth mới | Trạng thái đọc lại và TTL hết trong lúc chờ SQL, không phục hồi token cũ |PASS|

Schema test ngẫu nhiên riêng, chỉ DROP chính schema do test tạo, không public/database. Root regression và UI kiểm fingerprint thêm service_center (tám bảng gồm registry). Migration thật có bằng chứng trước/sau sáu bảng lõi30/30/6/200/200/30, SHA-256 toàn bộ hàng và sequence đều khớp; registry1/2 checksum không đổi, chỉ thêm3. Script kiểm lại cuối vẫn đạt. Account/password đang dùng không tạo lại, đã login bằng credential cũ.

## NFR và packaging

- NFR01: [100 mẫu mới](ui/nfr01-local.json),200 ticket,100/100 dưới1500ms; p95≈48,4ms/max49ms. Đo click→committed DOM+2 frames qua Next production/proxy/Express/PG, không chỉ HTTP. Không coi là load test production.
- NFR02: P5-I12 trong regression vẫn9/9 request trái quyền bị từ chối; hash8 bảng mỗi lượt bằng nhau. UI kiểmNV/QL/scope/401 và giữ snapshot/SLA.
- Compose project `mekong-centers-20261025`, port3337/3338, hai volume/credential mới riêng; không dùng development password. Image mới tự migrate trước đọc danh mục DB/credential/seed; ba healthy, API/UI thật và restart đạt. Đã down, giữ volume. Cấu hình/private receipt/password không chép vào evidence.
- **NOT RUN:** full profile verify container cho thay đổi này; kiểm đầy đủ local và smoke Linux container như trên. Không thay Dockerfile/Compose/lockfile hoặc dùng frontend mock để che lỗi.

## Các lượt chưa đạt và giới hạn

Hai lượt hồi quy đầu dừng ở assertion đếm5 FK của schema cũ; thực tế nay7 FK. Log được giữ tại [lượt đầu](regression-initial-run.txt), [lượt hai](regression-second-run.txt). Đã sửa đúng assertion, giữ kiểm toàn vẹn và chạy lại toàn bộ đạt; lượt trước tăng metadata version cũng được giữ trong regression-pre-version-run.txt. Test RESTRICT ban đầu đã điều chỉnh expected SQLSTATE theo PostgreSQL18 (23001); FK sai tham chiếu vẫn23503.

Docker build lần đầu gặp ECONNRESET khi tải dependency; [log mạng](compose-network-error.txt) được giữ. Thử lại đã thành công, bản cuối dùng manifest/lockfile gốc và cache hợp lệ; không nâng cấp thư viện hoặc sửa cấu hình mạng để bỏ qua lỗi. Warning runner Windows NO_COLOR/FORCE_COLOR/DEP0190 và thông báo npm có trong log; kết quả cuối không có test FAIL/SKIP.

Source CSV không được import/chỉnh sửa. Sáu trung tâm dataset, trường mã trung tâm/thành phố, product/account DB và UI/API quản trị để ngoài yêu cầu hiện tại. SRS/contract/ERD gốc/disclosure và các phase report cũ giữ nguyên; thay đổi thiết kế hiện hành ghi TD-22/SC-DB.
