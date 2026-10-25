# Giai đoạn 1 — Kiến trúc và cơ sở dữ liệu

**Ngày cập nhật:** 2026-10-23  
**Trạng thái:** PHASE 1 — HOÀN THÀNH VỀ THIẾT KẾ, SẴN SÀNG CHO PHASE 2  
**Phạm vi:** hoàn thiện baseline theo yêu cầu “Chốt các quyết định thiết kế và hoàn tất Phase 1”; dừng trước Phase 2. Không Git, cài dependency, viết endpoint, tạo/chạy migration hoặc seed.

## 1. Quyết định và căn cứ hiện hành

**DESIGN:** DEP-A, DD02/03/05/06/07/08, DEP-RANGE, AUTH và CRUD đều **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** trong yêu cầu hiện tại ngày 2026-10-23. DD01/04/09/10 giữ baseline có căn cứ. [Decision log](decision-log.md) ghi nội dung cụ thể, nguồn chấp thuận và chi tiết TECH do Codex chọn trong ủy quyền; không gán phê duyệt giảng viên.

**SOURCE:** đã đọc các tài liệu bắt buộc: AGENTS.md, kế hoạch Backend, báo cáo/log/mapping/kiến trúc trước sửa, DDL, API gốc, SRS và nhật ký thay đổi. Đối chiếu những phần L2 liên quan trong CS, BT1 bản31 trang, BT2 và Buổi5–9. Danh mục tên tệp/mục/trang chính xác tại [mapping, Mục1](../../../src/backend/docs/contract-schema-mapping.md). Giữ 8 FR/US,6 MUST/2 SHOULD, UC theo API (FR06→UC07,FR07→UC11,FR08→UC06); không dùng phiếu phạm vi ban đầu làm baseline.

Lịch sử: lượt đầu hoàn thành phần độc lập → lượt DEP-A chốt config → lượt hiện tại chốt DD/AUTH/CRUD và hoàn tất thiết kế. Các mục “chờ duyệt” cũ đã được thay thế hoặc giữ riêng trong lịch sử TD-01–TD-06.

## 2. Kết quả schema cuối

[DDL](../../schema.sql) có đúng 6 bảng: customer, device, issue_category, ticket, ticket_status_log, ticket_communication; tổng 51 cột/6 PK/5 FK RESTRICT/5 index tường minh. Không bảng account/product/center/session/token. schema_migration là một bảng kỹ thuật dự kiến ở Phase 2, chưa tạo.

- Thêm customer.center_id, device.product_id, device.deleted_at; không FK center/product config.
- Bỏ DEFAULT 12 của device.warranty_months; service phải cấp từ product active tin cậy. Device và snapshot cùng CHECK0–120 tháng.
- issue_desc/content CHECK1–2000 code point sau trim ECMAScript; cùng quy ước frontend/backend/SQL, reject NUL/surrogate lẻ ở validator.
- Giữ snapshot nullable đúng khi thiếu ngày mua, kiểm thứ tự ngày; thêm CHECK kết luận theo assessed_on/expiry và ma trận bốn tổ hợp warranty/approval. Hết hạn không cần duyệt; thiếu ngày mua có thể tạo chờ rồi duyệt mà snapshot ngày vẫn NULL.
- Giữ metadata approved_by/at/note; can_proceed suy ra. Phone/serial UNIQUE kể cả tombstone; ticket.customer_id suy ra qua device bất biến chủ. Các index phục vụ E03/E09/log/E12 và unique log đầu.
- Không trigger phức tạp, không constraint “mỗi thiết bị chỉ một phiếu mở”, không tự tính expiry/SLA trong DB.

Thay đổi so với BT1 và ảnh hưởng hồ sơ gốc được ghi tại [nhật ký thiết kế](../../thay-doi-thiet-ke.md), TD-07–TD-11.

## 3. API và kiến trúc đã chốt

**API:**13 endpoint E01–E13 gốc được ánh xạ đủ request/response/nguồn dữ liệu; giữ nguyên tệp API v0.1. [Phụ lục](../../api-contract-l2-extension.md) tạo5 endpoint đã được chấp thuận: login hạ tầng A01, PATCH/DELETE Customer, PATCH/DELETE Device. Không đặt mã E14 hoặc thêm FR/US. Có validation/quyền/status/errors/AC/E04/product inactive/miền tháng/Unicode và concurrency.

**Minimal Backend:** router HTTP mỏng→service→repository SQL→PostgreSQL; object config tin cậy cho products/centers/accounts/membership; withTransaction dùng chung connection, hàm now thay được trong test. Không ORM/DI/framework hoặc lớp reader/adapter chỉ để bọc config. [Kiến trúc](../../../src/backend/docs/backend-architecture-phase-01.md) chốt thuật toán tháng lịch/clamp/ngày cuối, SLA24/72/120 giờ thứ Hai–Bảy/bỏ Chủ nhật/biên00:00 theo Asia/Ho_Chi_Minh.

**AUTH:** login+scrypt private credential, random Bearer32 byte, Map digest session một process, TTL3600 giây/cap100/sweep60 giây; token hết hạn/restart401; principal/quyền từ server. Các thông số này là TECH, chưa có runtime config/KDF/session chạy được.

**Transaction/history:** thứ tự khóa customer→device→category cho intake/PATCH/DELETE; ticket+log nguyên tử; E11/E13 kiểm ticket độc lập cha ngừng. PATCH whitelist, DELETE204 lặp giữ timestamp, không cascade/xóa vật lý/chặn phiếu mở; snapshot cũ không đổi. Customer/device ngừng không dùng tiếp nhận mới; ticket cũ vẫn đọc/duyệt/ghi trao đổi theo quyền gốc.

**Config/migration/seed:** bỏ reference_config_version/fingerprint khỏi bảng migration dự kiến; version/ID ổn định, startup validate+đối chiếu ID DB kể cả lịch sử, bất biến trong process, đổi config ngoại tuyến có kiểm soát rồi restart. Dự kiến schema_migration bốn trường,001 sáu bảng→002 index/sequence→seed core theo config→startup; fixture có phiên bản, natural key, không ghi đè dữ liệu vận hành hoặc reset sequence.

## 4. Tệp thực tế tạo/sửa/xóa

| Thao tác | Tệp | Mục đích |
| --- | --- | --- |
| Sửa | [docs/schema.sql](../../schema.sql) | DDL cuối theo quyết định được duyệt |
| Sửa | [docs/thay-doi-thiet-ke.md](../../thay-doi-thiet-ke.md) | Lịch sử TD-07–TD-11, tác động BT1 |
| Sửa | [docs/progress/backend/decision-log.md](decision-log.md) | Trạng thái phê duyệt và TECH hiện hành |
| Sửa | [docs/progress/backend/phase-01.md](phase-01.md) | Báo cáo và nghiệm thu lượt hiện tại |
| Sửa | [src/backend/docs/contract-schema-mapping.md](../../../src/backend/docs/contract-schema-mapping.md) |13 E,5 endpoint phụ lục,51 cột, config/snapshot/suy ra |
| Sửa | [src/backend/docs/backend-architecture-phase-01.md](../../../src/backend/docs/backend-architecture-phase-01.md) | Kiến trúc, AUTH, CRUD, ngày/SLA, locking, migration/seed |
| Tạo | [docs/api-contract-l2-extension.md](../../api-contract-l2-extension.md) | Contract/AC bổ sung được chấp thuận |

Không xóa tệp. Không sửa API gốc, SRS, Frontend, mã Backend thử nghiệm, dependency, AGENTS/kế hoạch, PDF hoặc sơ đồ gốc. Không tạo khai báo AI tự động.

## 5. Kiểm chứng thực tế

**Kết quả lượt kiểm cuối ngày 2026-10-23: PASS 23/23 nhóm kiểm tự động tĩnh**, cộng đối chiếu thủ công các chính sách transaction/history/quyền và phạm vi. Công cụ: Python tiêu chuẩn chạy inline trong bộ nhớ (re/json/hashlib/calendar/datetime và bộ duyệt biểu thức CHECK có logic ba giá trị SQL), không tạo script trên đĩa, không thực thi SQL hoặc dùng Git. Bộ kiểm này không phải PostgreSQL parser/engine và không phải unit test của service chưa hiện thực.

| Nhóm kiểm | Kết quả | Bằng chứng / giới hạn |
| --- | --- | --- |
| DDL / cột / FK / index / câu lệnh | PASS — tĩnh |6 bảng/51 cột/6 PK/5 FK RESTRICT đúng kiểu đích/5 index tường minh;13 statement gồm BEGIN,6 CREATE TABLE,5 CREATE INDEX,COMMIT; cân bằng ngoặc/chuỗi, tên cột index hợp lệ |
| Ma trận warranty/approval | PASS — tĩnh | Duyệt9 tổ hợp từ chính chk_ticket_warranty_approval: đúng4 tổ hợp hợp lệ |
| Snapshot / metadata / kết luận ngày | PASS — tĩnh |12 tổ hợp presence,24 metadata,9 kết luận ngày;4 hình dạng ticket hợp lệ đều qua8 CHECK liên quan, gồm thiếu ngày mua chờ và đã duyệt |
| Unicode / miền tháng | PASS — tĩnh | Hai literal trim SQL cùng25 code point ECMAScript;8 mẫu chuỗi gồm rỗng/trắng/emoji/combining/2000/2001; tháng 0/120 chấp nhận,-1/121 loại; không default 12 |
| Tháng lịch / SLA | PASS — fixture thiết kế |4 phép cộng tháng,4 kiểm biên ngày hết hạn/0 tháng;11 vector SLA trích từ kiến trúc đều đúng. Tính độc lập trong bộ nhớ, chưa phải test service |
| E01–E13 request/response | PASS — tĩnh | Đối chiếu từng method/path, toàn bộ33 field request được liệt kê và123 lần xuất hiện key response mẫu với13 hàng mapping; không thiếu field. Giữ nguyên API gốc |
| Phụ lục / JSON / link / decision | PASS — tĩnh | Đủ 5 contract/AC;7 JSON mẫu phụ lục và44 JSON trong13 phần endpoint gốc parse được; liên kết nội bộ tồn tại, fence/UTF8 không lỗi;10 quyết định chính thức đều có trạng thái chấp thuận |
| Transaction/history/phân quyền/seed | PASS — review thiết kế | Đã đọc đối chiếu ma trận quyền gốc và phụ lục; khóa/guard/rollback/snapshot bất biến/cha ngừng/E11/E13/seed theo natural key có đặc tả nhất quán; chưa chạy transaction hoặc test quyền thật |
| Hash / phạm vi thay đổi | PASS | SHA-256 so 56 tệp đầu lượt: đúng 6 tệp cũ sửa,50 tệp cũ còn lại giữ nguyên,1 phụ lục mới,0 xóa; cuối 57 tệp. Inventory bỏ qua .git/node_modules/.next/dist/build/.codex/.agents. Nguồn Project/PDF chỉ được đọc, không có thao tác ghi |
| PostgreSQL DDL/FK/CHECK thực thi | NOT RUN | Chưa chạy engine thật; phải kiểm trên PostgreSQL UTF8 khi Phase 2 được giao |
| AUTH/KDF/session, API, service/unit/integration/concurrency | NOT RUN | Chưa có hiện thực trong phạm vi lượt này |
| Migration/seed/reproducibility/NFR/UI | NOT RUN | Chưa tạo/chạy; index và đặc tả không chứng minh NFR đạt |

Hash xác nhận các tệp được khảo sát ngoài whitelist giữ nguyên, gồm API gốc/SRS/AGENTS/kế hoạch/Frontend/Backend thử nghiệm/ERD hiện có. Không suy kết quả này thành đã kiểm nội dung mọi thư mục cache hoặc đã thực thi bảo vệ lịch sử trên DB.

Shell mặc định và môi trường node_repl gặp lỗi khởi tạo MXC HRESULT0x80070020. Các lệnh đọc/kiểm tĩnh theo phạm vi bằng exec_command require_escalated đã được auto-review chấp thuận; apply_patch sửa tệp bình thường. Đây không là bằng chứng repository thiếu writable root/NTFS write. Không yêu cầu Full access hoặc sửa cấu hình toàn máy.

## 6. Đối chiếu17 tiêu chí bắt buộc và cổng Phase 1

| STT | Tiêu chí thiết kế | Kết quả nghiệm thu tĩnh / căn cứ |
| --- | --- | --- |
|1| Chính xác6 bảng nghiệp vụ | PASS — kiểm CREATE TABLE và51 cột |
|2| Không thêm bảng account/product/center/session | PASS — toàn bộ6 tên bảng thuộc lõi L2 |
|3| Đúng cột DD03/DD07/CRUD | PASS — customer.center_id, device.product_id/deleted_at đúng DDL/mapping |
|4| Không DEFAULT 12 tháng | PASS — cột months bắt buộc tường minh |
|5| Giới hạn dữ liệu/CHECK đúng | PASS — miền 0–120, Unicode1–2000, CHECK snapshot/metadata/ngày |
|6| FK lõi hợp lệ | PASS —5 FK, đích/cột/kiểu tồn tại, RESTRICT |
|7| Không FK config | PASS — đích REFERENCES chỉ thuộc6 bảng lõi |
|8| E01–E13 đủ request/response mapping | PASS —13 hàng kiểm method/path/field so bản gốc |
|9| Login/bốn CRUD có contract/AC | PASS — phụ lục A01/CU/CD/DU/DD và AC-E04 |
|10| Ma trận bảo hành/phê duyệt nhất quán | PASS —9 tổ hợp CHECK cho4 hợp lệ; thiếu mua vẫn duyệt được |
|11| Snapshot/transaction/soft delete giữ lịch sử | PASS — review E08/PATCH/DELETE/E09–E13 và4 shape qua CHECK; chưa chạy DB |
|12| Thiết kế QT-14/QT-15 đủ quyền/phạm vi/masking | PASS — đối chiếu ma trận role, principal server, filter scope và error masking; chưa test HTTP |
|13| Migration/seed có đầu vào/thứ tự | PASS — kiến trúc Mục6: config/DB rỗng→migrate→seed→startup, transaction/checksum/idempotency; chưa thực thi |
|14| Decision Log không để mở quyết định đã duyệt | PASS — đủ 10 hàng trạng thái chính thức, phân biệt TECH/lịch sử |
|15| Các tài liệu Phase 1 nhất quán | PASS — đối chiếu51 cột/13 E/5 phụ lục/4 trạng thái/config/history/AC và link; hồ sơ gốc có nhật ký sai lệch |
|16| Không chức năng/bảng vượt phạm vi | PASS — sáu bảng và đúng năm endpoint bổ sung được duyệt, không module quản trị/luồng sửa chữa |
|17| Tệp không được phép sửa giữ nguyên | PASS — hash 50 tệp cũ ngoài whitelist,0 xóa; chỉ đọc tài liệu nguồn |

**Cổng Phase 1: ĐẠT VỀ THIẾT KẾ,17/17 tiêu chí tĩnh được nghiệm thu.** Schema đủ nguồn/field, dependency/hành vi biên/quyền/history/transaction được chốt, thay đổi baseline có truy vết, không quyết định đã duyệt còn mở và không blocker thiết kế ảnh hưởng migration.

**Sẵn sàng chuyển Phase 2 khi có yêu cầu riêng của sinh viên.** Runtime/DB/migration/API chưa chạy không là thất bại Phase 1. Lượt này kết thúc tại thiết kế, không tạo foundation hoặc tự chuyển giai đoạn.

## 7. Hạn chế và việc thuộc giai đoạn sau

- DDL chưa được thực thi trên PostgreSQL; còn phải kiểm parser/UTF8/transaction/FK/CHECK/UNIQUE/concurrency trên DB thật. Không có kết quả BT2 CRUD/login hay NFR runtime để báo đạt.
- DEP-A không có FK config; SQL ngoài service có thể bỏ qua kiểm. Không fingerprint tự phát hiện tái sử dụng cùng ID trái quy trình; cần giữ bản config cũ/backup và quy trình cập nhật có kiểm soát.
- SRS/UC/ERD/DBML/PDF gốc còn cần đồng bộ trước lần nộp tiếp theo; quyền QL đọc E10/E12 và mã UC đã được ghi sai lệch. Không âm thầm sửa bản đã nộp, không tạo blocker xin duyệt lại quyết định hiện hành.
- Backend thử nghiệm giữ nguyên; Phase 2 khi được giao cần khảo sát runtime/PostgreSQL/dependency thực, hiện thực foundation rồi kiểm migrate/seed/idempotency. NFR01 cần đo UI 100 lượt với 200 phiếu, NFR03 cần toàn hệ thống tối đa 2 lệnh sau chuẩn bị.

## 8. Nội dung đề xuất khai báo AI

**Công cụ:** OpenAI Codex.  
**Mục đích:** hỗ trợ đối chiếu nguồn L2/BT1/BT2, hoàn thiện baseline Phase 1 theo quyết định sinh viên; hỗ trợ sửa DDL, viết phụ lục API, mapping/kiến trúc/decision log/nhật ký thay đổi/báo cáo.  
**Phạm vi:** đúng bảy tệp tại Mục4; không sinh ứng dụng/migration/seed hoặc sửa nguồn học phần.  
**Kiểm chứng của Codex:** đọc/đối chiếu tài liệu và thực hiện các kiểm tĩnh/hash nêu tại Mục5; không chạy PostgreSQL/API.  
**Sinh viên cần tự kiểm chứng:** đọc các quyết định/DDL/phụ lục, đối chiếu nguồn và schema, giải thích thuật toán/tham chiếu config/quyền/snapshot/soft delete; khi có hiện thực phải chạy DB/API/test và ghi đúng bằng chứng. Chưa có căn cứ để khẳng định sinh viên đã làm các bước đó.

Đây là nội dung đề xuất, không tự sửa docs/ai-disclosure.md hoặc khai thay việc sinh viên đã kiểm chứng.
