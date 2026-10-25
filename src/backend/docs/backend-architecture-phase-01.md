# Backend L2 — Baseline kiến trúc Minimal Backend

**Ngày chốt:** 2026-10-23 · **Phase 1 — HOÀN THÀNH VỀ THIẾT KẾ.**  
**DESIGN:** DEP-A, DD02/03/05/06/07/08, DEP-RANGE, AUTH và CRUD đã được sinh viên chấp thuận trong yêu cầu hiện tại. Không gán cho giảng viên hoặc coi là quy tắc nguyên thủy của doanh nghiệp. Chưa hiện thực mã/config/migration/seed; không tự bắt đầu Phase 2.

Nguồn và trang: [mapping](contract-schema-mapping.md), Mục 1. API gốc: [v0.1](../../../docs/api-contract-l2.md); login/CRUD/AC mới: [phụ lục v1.0](../../../docs/api-contract-l2-extension.md). Trạng thái và chi tiết TECH được chọn trong ủy quyền: [decision log](../../../docs/progress/backend/decision-log.md).

## 1. Kiến trúc và trách nhiệm

HTTP Routes → Services → Repositories → PostgreSQL. Router mỏng có thể làm controller; không bắt buộc lớp controller riêng, interface/class theo cặp, DI framework, ORM, CQRS hoặc event bus. Monolith local một process với hai cụm nghiệp vụ: hồ sơ tiếp nhận (customer/device) và phiếu L2 (ticket/approval/communication).

~~~text
src/backend/
  src/
    app.ts, server.ts             ghép phụ thuộc / listen, shutdown
    routes/                      customer, device, ticket và login HTTP
    services/                    customer, device, ticket; tách khi nhiều trách nhiệm
    repositories/                hàm SQL customer/device/ticket/catalog
    db.ts                        pool và withTransaction
    reference-config.ts          nạp, kiểm, đóng băng config
    auth.ts                      password/token/session và hàm kiểm quyền
    rules.ts                     phone, warranty và SLA thuần
    validation.ts, errors.ts     kiểm input / lỗi chung
    views.ts                     output snake_case, ngày, phone
  config/reference-data.json     metadata không bí mật; chưa tạo
  migrations/, seeds/            chỉ viết ở Phase 2
  tests/unit/, tests/integration/
  docs/
~~~

Đây là cấu trúc thiết kế, không phải các file đã được tạo. Routes kiểm input/HTTP, gọi service và chuyển mã lỗi; không SQL/nghiệp vụ. Services nhận principal/input thuần, không req/res/mã HTTP hoặc SQL. Repositories chỉ truy vấn tham số hóa và thực hiện guard ghi theo yêu cầu service; không tự quyết định quyền/SLA/phê duyệt. Dùng driver PostgreSQL trực tiếp, giữ package manager/lockfile/strict hiện có; chọn dependency cần thiết ở Phase 2, không nâng cấp ở Phase 1.

| Nhóm hàm service | Repository / dependency | Nghiệp vụ |
| --- | --- | --- |
| customer: lookup/create/patch/softDelete | customer repository, config.accounts/centers, normalizePhone | E01/E02 + CU/CD; ownership center, UNIQUE phone, privacy |
| device: list/create/patch/softDelete | customer/device repository, config.products, now | E03/E04 + DU/DD; owner bất biến, tháng tin cậy, ngày mua |
| catalog: đọc | products config; catalog repository cho issue_category | E05/E06; active, sort/pagination, map mã→nhãn |
| ticket: create/list/detail | customer/device/ticket/catalog repository, withTransaction, now, rules | E08/E09/E10; snapshot/SLA/log |
| ticket: approve/communications | ticket repository gồm log/communication; config, now | E11/E12/E13; duyệt một lần và lịch sử nối tiếp |
| auth | config + credential private + Map session | A01 và Bearer gate; quyền kiểm lại ở service |

Không tạo ProductReader/AccountReader/CenterReader hoặc repository giả cho config. Truyền object các hàm repository và hàm now vào service để unit test thay được; fake chỉ ở test. Gộp các helper liên quan, tách khi có trách nhiệm thực sự khác nhau.

**IMPLEMENTATION hiện tại:** code thử nghiệm dùng mảng, chưa PostgreSQL/service/auth, cổng4000 và response cũ khác contract. package có dev và test placeholder; không sửa hoặc chạy chúng trong Phase 1. Thiết kế cấu hình cổng/base URL ở Phase 2, không tự sửa Frontend.

## 2. DEP-A và toàn vẹn tham chiếu

Đúng6 bảng nghiệp vụ: customer, device, issue_category, ticket, ticket_status_log, ticket_communication. Cho phép1 bảng kỹ thuật schema_migration ở Phase 2. Không bảng employee/product/service_center/employee_center/session/token; issue_category vẫn là bảng lõi trong PostgreSQL.

| Nhánh config | Dữ liệu / kiểu | Ràng buộc nạp |
| --- | --- | --- |
| Gốc | config_version: integer dương; centers/products/accounts: mảng | Có phiên bản, đúng cấu trúc đã công bố; không tự điền giá trị nghiệp vụ thiếu |
| centers | center_id integer an toàn dương; center_name string không rỗng; is_active boolean | ID duy nhất, không tái dùng ID để chỉ trung tâm khác |
| products | product_id integer an toàn dương; product_name string không rỗng; warranty_months integer0–120; is_active boolean | ID duy nhất; không lấy số tháng từ client; inactive vẫn giữ entry lịch sử |
| accounts | employee_id integer an toàn dương; username string1–64 sau trim; role một trong hai role API; active_center_id; allowed_center_ids mảng ID; is_active | ID/username duy nhất, allowed không rỗng/không trùng; mọi center tồn tại; active thuộc allowed, center active khi account active |

Account NV thao tác theo active_center_id; QL theo allowed_center_ids, không tự có quyền NV/toàn công ty. Membership là dữ liệu config, không cột mảng DB được gọi là FK. Credential hash/salt nạp riêng từ file private/env; không plaintext hoặc secret thật trong source, không ghi vào seed. Giữ entry inactive để giải nghĩa actor/product/center lịch sử. Config chỉ chứa dependency, không chứa customer/device/ticket mutable.

### 2.1. Kiểm trước listen và khi dùng

1. Nạp và validate kiểu, ID/username trùng, role, membership, miền months và phiên bản cấu hình; credential theo AUTH. Sai thì dừng rõ CONFIGURATION_ERROR, không cấp token mặc định.
2. Sau khi DB/schema đã được dựng bằng tác vụ Phase 2 riêng, kiểm chỉ đọc DISTINCT ticket.center_id/customer.center_id với centers; device.product_id với products; ticket.received_by/approved_by, log.changed_by, communication.created_by với accounts, kể cả hàng soft delete. ID thiếu phải dừng; không tự gán ID khác/xóa hàng/sửa snapshot.
3. Actor lịch sử không cần còn active/giữ vai trò cũ; trung tâm/sản phẩm lịch sử được inactive nhưng không được mất entry. Role hiện tại không được dùng để diễn giải lại quyết định phê duyệt cũ.
4. Giữ một object config đã kiểm và đóng băng sâu cho cả seed/service trong vòng đời process; không hot reload. Service kiểm active khi tạo mới và scope/role tại mỗi thao tác. Không JOIN/khóa hàng DB phụ trợ không tồn tại.
5. SQL ngoài ứng dụng có thể vượt kiểm config. PostgreSQL chỉ có5 FK giữa bảng lõi, CHECK >0 không bảo đảm ID phụ trợ tồn tại hoặc được phép.

### 2.2. Quy trình đổi config tối giản

**Đã bỏ khỏi baseline** reference_config_version/reference_config_fingerprint trong schema_migration. Bảng migration chỉ version/name/checksum/applied_at cho SQL, không quản trị phiên bản danh mục hoặc quyền.

Giữ bản config cũ có phiên bản cùng bộ cấu hình chạy/backup; khi bổ sung dữ liệu mẫu: dừng Backend → so config cũ/mới theo ID → giữ ý nghĩa ID đã dùng, bổ sung ID mới thay vì tái sử dụng → tăng config_version và ghi lý do trong tài liệu cấu hình/README → chạy cùng validation và đối chiếu ID DB → khởi động lại. Không tự ghi cấu hình đang chạy hay sửa dữ liệu lịch sử. Mất bản config cũ thì khôi phục bản đã biết từ bộ cấu hình được lưu; không đoán lại danh tính theo ID.

Có thể đổi quyền/active bằng thay config có kiểm soát rồi restart; session cũ mất hiệu lực. Nếu đổi product months cho thiết bị tương lai, không sửa device.warranty_months hoặc ticket snapshot đã lưu; E04 lấy config mới, E07 dùng months đã lưu ở device, E08 chụp từ device. Tên/ý nghĩa ID đã dùng cần kiểm thủ công với bản cũ. Giới hạn được chấp nhận: kiểm ID/phiên bản không tự phát hiện một người cố ý tái sử dụng cùng ID/sửa nghĩa ngoài quy trình. Không có rủi ro prototype bắt buộc fingerprint/bảng metadata phức tạp để hoàn thành Phase 1.

## 3. Ngày, bảo hành và SLA đã chốt

now là hàm duy nhất cung cấp thời điểm nghiệp vụ, thay bằng fixed clock trong test. Timestamp lưu TIMESTAMPTZ, DATE giữ ngày lịch, DB dùng UTF8; serialize theo offset+07:00. Mọi phép tính ngày theo Asia/Ho_Chi_Minh, không timezone Windows/container. Không cho client gửi received_at/due_date/actor/approval timestamp vào E08/E11/E13.

### 3.1. Warranty — DD05/DEP-RANGE

Input: purchase_date nullable, months integer0–120 từ device đáng tin, assessed_on (ngày địa phương received_at khi E08; query/ngày server khi E07).
- Thiếu purchase_date: CHUA_XAC_MINH, expires_on NULL, cần duyệt. Không tự điền ngày mua.
- Có ngày mua sau assessed_on: validation error, không kết luận còn hạn.
- Cộng months vào year/month trực tiếp, lấy ngày min(ngày mua, số ngày tháng đích). Không lặp cộng từng tháng gây trôi ngày31; không đổi tháng thành30 ngày.
- purchase_date <= assessed_on <= expiry: CON_BAO_HANH; assessed_on > expiry: HET_BAO_HANH. months0 ⇒ expiry=ngày mua.
- E07 chỉ preview, không ghi. E08 tính lại bằng server rồi lưu snapshot. E10/E11 không tính lại theo ngày xem/device hiện tại.

| Tình huống kiểm thử dự kiến | Kỳ vọng |
| --- | --- |
| 2026-01-31 +1 tháng | 2026-02-28 |
| 2024-02-29 +12 tháng | 2025-02-28 |
| 2026-01-31 +2 tháng | 2026-03-31, không trôi sang28 |
| Đánh giá đúng expiry / ngày kế tiếp | Còn / hết |
| months0, đánh giá ngày mua / ngày sau | Còn / hết |
| months -1/121, không integer | Config/validation lỗi, không ghi |
| Thiếu ngày mua | Chưa xác minh, không coi còn/hết |

### 3.2. SLA — DD06

CAO24h, TRUNG_BINH72h, THAP120h. Mỗi ngày thứ Hai–Bảy đủ24h, bỏ toàn bộ Chủ nhật, không giờ hành chính/ngày lễ. Thuật toán thuần:
1. pointer=received_at, remaining=giờ ưu tiên quy ra milliseconds.
2. Nếu pointer ở Chủ nhật, chuyển pointer sang00:00 thứ Hai kế tiếp, chưa giảm remaining.
3. Với ngày khác: boundary=00:00 ngày địa phương kế tiếp; lấy phần min(remaining, boundary-pointer), tăng pointer và giảm remaining.
4. Nếu còn remaining, lặp bước2–3. Khi đủ giờ, nếu pointer đúng00:00 Chủ nhật thì chuyển sang00:00 thứ Hai.
5. Trả pointer là due_date; không tính lại khi duyệt. Giữ độ chính xác timestamp, không làm tròn về ngày.

| Nhận tại Asia/Ho_Chi_Minh | Priority | Due dự kiến |
| --- | --- | --- |
| 2026-09-28 09:00 thứ Hai | CAO | 2026-09-29 09:00 |
| 2026-09-28 09:00 | TRUNG_BINH | 2026-10-01 09:00 |
| 2026-09-28 09:00 | THAP | 2026-10-03 09:00 |
| 2026-10-03 09:00 thứ Bảy | CAO | 2026-10-05 09:00 |
| 2026-10-03 09:00 | TRUNG_BINH | 2026-10-07 09:00 |
| 2026-10-03 09:00 | THAP | 2026-10-09 09:00 |
| 2026-10-04 09:00 Chủ nhật | CAO | 2026-10-06 00:00 |
| 2026-10-04 09:00 | TRUNG_BINH | 2026-10-08 00:00 |
| 2026-10-04 09:00 | THAP | 2026-10-10 00:00 |
| 2026-10-03 00:00 thứ Bảy | CAO | 2026-10-05 00:00, đúng biên đủ24h |
| 2026-10-02 09:00 thứ Sáu | TRUNG_BINH | 2026-10-06 09:00, đi qua Chủ nhật |

### 3.3. Ma trận bảo hành/phê duyệt

| warranty_status | approval_status | Metadata | can_proceed |
| --- | --- | --- | --- |
| CON_BAO_HANH | KHONG_CAN | actor/time/note NULL | true |
| HET_BAO_HANH | KHONG_CAN | actor/time/note NULL | true; không hứa miễn phí |
| CHUA_XAC_MINH | CHO_PHE_DUYET | actor/time/note NULL | false |
| CHUA_XAC_MINH | DA_PHE_DUYET | actor/time bắt buộc, note optional | true |

SQL CHECK giữ đúng4 tổ hợp; không chặn tạo thiếu ngày mua hoặc phê duyệt sau đó. status vòng đời vẫn MOI khi tạo/duyệt. Approval không làm CHUA_XAC_MINH thành CON_BAO_HANH, không khởi động lại SLA, không thêm status log giả. can_proceed suy ra, không lưu thêm boolean.

## 4. Transaction, khóa và soft delete

withTransaction dùng một connection cho BEGIN/COMMIT/ROLLBACK và mọi repository trong callback; release trong finally. Service điều phối, lỗi rollback không che lỗi gốc. Không BEGIN bằng pool rồi INSERT bằng connection khác. READ COMMITTED + row lock/UNIQUE là mức thiết kế cho ghi; list+count nhiều query dùng read-only REPEATABLE READ hoặc một query tổng hợp để cùng tập dữ liệu/quyền.

**Thứ tự khóa chuẩn:** customer → device → category (nếu kiểm/cập nhật active đồng thời). Dùng nhất quán ở E04/E08/CU/CD/DU/DD. Không khóa config. E11/E13 chỉ khóa ticket cần thiết, không khóa parent vì parent ngừng không cấm thao tác ticket cũ.

- E02: normalize phone, INSERT dựa UNIQUE toàn cục; unique lỗi thì rollback trước query existing_customer. Hồ sơ ngừng/ngoài scope nhận409 chung, không lộ hồ sơ. Không tạo lại để né soft delete.
- E04: khóa customer active; kiểm product config active; INSERT device đúng owner/product/months. UNIQUE serial quyết định race; trùng không đổi chủ. Không default12.
- E08: khóa customer/device, kiểm active/scope/owner; chọn category active và priority input; lấy một now cho received_at/log, tính warranty/SLA, INSERT ticket + snapshot + log NULL→MOI cùng transaction. Một bước lỗi rollback cả hai. Mã phiếu sequence riêng, không COUNT+1; số có thể hở khi rollback.
- TECH mã phiếu: BH-<counter ít nhất6 chữ số>/<năm địa phương>, counter tối đa12 chữ số để vừa VARCHAR20, không reset theo năm. Sequence runtime đề xuất bắt đầu1000000; fixture mã900001–900200/2026 để không đụng. Unique DB giữ mã; chốt kỹ thuật này không yêu cầu số liên tục.
- E11: role/scope QL, SELECT ticket FOR UPDATE kể cả parent ngừng; service kiểm CHUA_XAC_MINH/CHO_PHE_DUYET/MOI; UPDATE có guard và chỉ actor/time/note/approval_status. Hai duyệt một200/một409 ALREADY_APPROVED; không ghi đè lần đầu.
- E13: kiểm ticket hợp lệ/scope/role, INSERT communication nối tiếp cùng actor/time server; không cần đã duyệt, không chặn vì parent ngừng, không gửi tin nhắn.
- CU/DU PATCH: quan sát target hoạt động trong scope, mở transaction/khóa đúng thứ tự và đọc lại. Nếu bị ngừng giữa quan sát và lock→409 RESOURCE_CHANGED; đã ngừng ngay từ đầu→404. Chỉ cập nhật field có mặt; hai PATCH hoạt động được serialize, field khác không bị ghi đè, field trùng lần sau thắng; không thêm version column.
- CD/DD DELETE: kiểm scope cả tombstone rồi khóa; lần đầu SET deleted_at, lặp204 giữ timestamp đầu. Không kiểm “có phiếu mở”, không DELETE/cascade hay sửa history. Device DELETE cho phép parent đã ngừng; device PATCH đòi parent active. Không đồng nghĩa ngừng customer tự ngừng mọi device.
- E08 đấu với PATCH: snapshot từ trước hoặc sau lần cập nhật theo khóa, không trộn. E08 đấu với DELETE: nếu E08 commit trước thì ticket hợp lệ và giữ nguyên; nếu DELETE thắng thì E08 kiểm lại active và không tạo. Request quan sát trước nhưng mất điều kiện có thể409 theo phụ lục; request bắt đầu sau ngừng trả404 theo v0.1.

Ticket history E09–E13 lấy scope từ ticket.center_id, join customer/device không lọc deleted_at của parent; vẫn che phone NV. Tài nguyên ticket đã ngừng/ngoài quyền vẫn404 như contract. Không sửa snapshot khi DU đổi ngày mua; vẫn phải duyệt ticket CHUA_XAC_MINH cũ. FK RESTRICT ngăn phá tham chiếu, không tự cấm mọi DELETE vật lý; repository/app không cung cấp xóa vật lý customer/device/ticket/lịch sử theo baseline. DB privilege/constraint/service cần được kiểm trên DB thật ở Phase2 trở đi.

## 5. AUTH, validation và output

AUTH đã duyệt HTTP login + Bearer + session bộ nhớ + account config, không bảng. [Phụ lục Mục3](../../../docs/api-contract-l2-extension.md) chốt body/response/errors, TTL3600 giây, cap100, sweep60 giây, scrypt async và random token32 byte, digest Map. Không refresh/register/đổi/quên mật khẩu hoặc API quản trị. now giả lập dùng cho TTL test; restart làm hết hiệu lực tất cả token.

Server lấy role/active/allowed centers từ config, không header/body tự khai. Error handler chung; services dùng mã nghiệp vụ không HTTP; DB exception không lộ SQL/token/phone. Bigint từ driver chuyển number sau kiểm integer an toàn. Phân biệt JSON/kiểu/field lỗi400, auth401, role403, resource404, conflict409, media415, config/system500; login capacity503 chỉ trong phụ lục, không thay E01–E13.

DD08 dùng code point sau trim ECMAScript, không UTF16 length hoặc min10; reject NUL/surrogate lẻ; SQL btrim tập Unicode tường minh, char_length1–2000. Unicode/null/whitelist/password không trim và các trường hợp biên được đặc tả duy nhất trong phụ lục Mục2, dùng lại trong validation/test. Phone policy QT-15 áp dụng cả success/error.existing_customer; không trả hồ sơ ngừng/ngoài scope hoặc Location chứa phone thô. Không tự tuyên bố quét toàn bộ PII trong nội dung trao đổi tự do.

## 6. Migration/seed tối giản và tái lập

Chỉ thiết kế, chưa tạo tệp/chạy lệnh:
1. Bootstrap schema_migration(version PK,name,checksum,applied_at), không cột reference_config_version/fingerprint.
2. 001_core_schema.sql: sáu bảng theo thứ tự customer→device→issue_category→ticket→ticket_status_log→ticket_communication, đầy đủ cột mới/constraints. 002_indexes_and_ticket_sequence.sql nếu cần tách index/sequence; có thể gom để ít file.
3. Runner serialize các lần migrate bằng khóa kỹ thuật, transaction mỗi migration; ghi version cùng commit DDL. Runner sở hữu BEGIN/COMMIT: khi chuyển DDL thiết kế thành migration, lấy phần CREATE tương ứng, không giữ thêm BEGIN/COMMIT của schema.sql gây transaction lồng. Lần hai bỏ qua đã áp dụng; checksum/version lệch thì dừng, không dùng IF NOT EXISTS để che thiếu schema. Sau phát hành chỉ thêm migration mới, không sửa migration đã áp dụng.
4. Chuẩn bị DB rỗng và config đã validate; migrate→seed→startup compatibility→listen theo hướng dẫn thật sẽ viết ở Phase2. DB đang có skeleton/dữ liệu phải được đánh giá riêng, không DROP hoặc chạy schema.sql lặp một cách mù quáng.
5. Seed chỉ nạp bảng lõi, dependency lấy config không INSERT center/account/product/membership. ID core resolve theo phone/serial/category code/ticket_code fixture, không hardcode ID từ ví dụ API. customer.center_id và device.product_id/explicit months phải nhất quán config.
6. Fixture mô phỏng có phiên bản, seed42 nếu dùng random, thời gian cố định2026-09-28 09:00+07; dự kiến30 customer/30 device,6 category,200 ticket với initial logs,30 communication. Tháng0/120, thiếu ngày mua, hết hạn, chờ/đã duyệt, inactive/deleted và2 trung tâm/nhiều role phục vụ test. CSV LMS chưa có trong phạm vi khảo sát nên không gán nguồn CSV thật.
7. Seed transaction, khóa serialize; khóa fixture trùng thì chỉ kiểm/đọc, không DO UPDATE reset vận hành/snapshot/approval/deleted_at. Xung đột khác dữ liệu fixture báo lỗi/rollback. Log/communication tạo cùng lúc ticket fixture mới; ticket đã tồn tại thì kiểm lịch sử, không thêm lại hay tự “chữa”. Không restart sequence hoặc đặt nó lùi.
8. Phase2 kiểm migrate từ sạch/lần hai, seed hai lần và tạo một phiếu vận hành xen giữa để chứng minh không đè/nhân đôi. Các lệnh package/README chỉ ghi sau hiện thực; chưa cam kết đã chạy.

## 7. Kiểm chứng và cổng kết thúc Phase1

Kiểm tĩnh: sáu bảng, cột/miền/default/CHECK/FK/index; mapping13 E +5 endpoint phụ lục; matrix trạng thái; Unicode và các vector ngày/SLA; quyền/history/locking; trạng thái decision; hash tệp ngoài phạm vi. Kết quả ở [phase-01.md](../../../docs/progress/backend/phase-01.md).

Kế hoạch test sau này: service với fake repositories/now; DB thật kiểm UNIQUE/FK/CHECK/rollback/concurrency/seed; HTTP shape/error/quyền và token; ít nhất ba loại đúng/biên/sai của BT2. Không lấy fake chứng minh transaction DB, index chứng minh NFR01 UI, Backend riêng chứng minh NFR03 toàn hệ thống hoặc bộ contract mới chứng minh BT2 CRUD đã chạy.

Không còn quyết định thiết kế được duyệt nào phải hỏi lại. Việc đồng bộ SRS/UC/ERD/PDF gốc là tác vụ tài liệu riêng được ghi nhận, không tự sửa hồ sơ đã nộp và không chặn baseline SQL khi thay đổi đã truy vết. Phase1 hoàn tất về thiết kế; Phase2 chỉ bắt đầu khi sinh viên giao riêng, kiểm môi trường PostgreSQL/runtime/dependency thực và chạy kiểm chứng mới.

## 8. Lịch sử ngắn

Lượt đầu hoàn thành phần độc lập; lượt DEP-A chốt config; lượt hiện tại chốt các DD/AUTH/CRUD, schema/phụ lục và bỏ config fingerprint. Bản kiến trúc hiện hành thay thế các phương án đang chờ duyệt cũ, không duy trì nhiều kiến trúc thay thế trong baseline.
