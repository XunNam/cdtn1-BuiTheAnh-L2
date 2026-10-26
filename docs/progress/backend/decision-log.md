# Nhật ký quyết định Backend L2

**Cập nhật:** 2026-10-24 · **Baseline:** Phase 1 đã chốt; Phase 2 được sinh viên nghiệm thu; Phase 3 đã hiện thực Customer/Device, xem Mục 8.

Nguồn chấp thuận hiện hành là yêu cầu **“CĐTN1 L2 — Chốt các quyết định thiết kế và hoàn tất Phase 1”** của sinh viên ngày 2026-10-23. Đây là quyết định của sinh viên, không phải phê duyệt mới của giảng viên. Các quy tắc có nguồn được phân biệt với lựa chọn thiết kế và chi tiết kỹ thuật do Codex chọn trong phạm vi ủy quyền.

Danh mục nguồn và trang đã đối chiếu: [Contract–Schema, Mục 1](../../../src/backend/docs/contract-schema-mapping.md). Chi tiết hành vi: [phụ lục API](../../api-contract-l2-extension.md) và [kiến trúc](../../../src/backend/docs/backend-architecture-phase-01.md). Các mục dưới đây chỉ chốt thiết kế; config, login, CRUD và PostgreSQL chưa được hiện thực trong lượt này.

## 1. Baseline và ranh giới công việc

| Mã | Xác nhận hiện hành | Căn cứ / giới hạn |
| --- | --- | --- |
| BASE-01 | Chỉ hoàn thiện bảy tệp thiết kế/schema được giao; kết thúc sau Phase 1 | Yêu cầu hiện tại; không Git, dependency, migration, seed hoặc endpoint thực thi |
| BASE-02 | Giữ 8 FR/US, 6 MUST/2 SHOULD | Sinh viên xác nhận; SRS và BT1 tr. 7; không dùng lại phiếu phạm vi ban đầu |
| BASE-03 | FR06/US06→UC07; FR07/US07→UC11; FR08/US08→UC06 | Dùng mã theo API và yêu cầu sinh viên; sai lệch PDF BT1 tr. 22/24 là việc đồng bộ hồ sơ riêng |
| BASE-04 | Node.js/Express/TypeScript/PostgreSQL, prototype local L2 | BT1 tr. 20 và hiện trạng dự án; không đổi stack/package manager |
| BASE-05 | Repository ổ D thuộc workspace/writable roots phiên hiện tại | Cấu hình phiên cho phép ghi repo; công cụ apply_patch đã sửa tệp trong phạm vi. Shell mặc định lỗi khởi tạo MXC; đọc/kiểm tĩnh bằng lệnh có nâng quyền theo phạm vi đã được auto-review chấp thuận. Không suy ra lỗi quyền NTFS hay cần Full access |

## 2. Quyết định nghiệp vụ và dependency đã chốt

Mọi hàng mang trạng thái dưới đây được chấp thuận bởi **sinh viên trong yêu cầu hiện tại, ngày 2026-10-23**. Cột căn cứ không có nghĩa toàn bộ chi tiết lựa chọn đã tồn tại trong nguồn học phần.

| Mã | Lựa chọn đã chốt và tác động | Căn cứ / phân loại | Trạng thái |
| --- | --- | --- | --- |
| DEP-A (baseline; phần center được SC-DB thay thế) | Sáu bảng nghiệp vụ lõi PostgreSQL; baseline products/centers/accounts/membership từ config tin cậy. Chỉ thêm tối đa một schema_migration kỹ thuật ở Phase 2; không bảng employee/product/service_center/employee_center/session/token và không API quản trị | DESIGN theo yêu cầu sinh viên; FK lõi vẫn giữ, tham chiếu phụ trợ do service/startup kiểm | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| DD02 | Hết hạn vẫn tạo phiếu 201 khi dữ liệu khác hợp lệ: HET_BAO_HANH/KHONG_CAN/can_proceed=true. Không cần duyệt và không suy ra miễn phí; thu phí/sửa chữa ngoài L2 | DESIGN; CS Mục 3 tr. 5, biểu mẫu tr. 8 có bảo hành/sửa chữa nhưng không quy định đầy đủ policy này | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| DD03 | customer.center_id là trung tâm sở hữu ban đầu, do principal server cấp; không FK config, không chuyển/chia sẻ liên trung tâm. Device theo customer; ticket.center_id riêng. Phone UNIQUE toàn cục, xung đột ngoài quyền chỉ trả 409 chung, không nhận diện hồ sơ | DESIGN thực thi SOURCE QT-14/QT-15, CS Bảng 9.1 tr. 19 | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| DD05 | Cộng tháng lịch trực tiếp tới tháng đích, clamp ngày cuối tháng; ngày hết hạn còn bảo hành, ngày sau hết hạn; thiếu ngày mua là chưa xác minh; 0 tháng chỉ còn trong ngày mua | DESIGN làm rõ SOURCE QT-05; không dùng 30 ngày/tháng, không thêm trạng thái | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| DD06 | CAO/TRUNG_BINH/THAP=24/72/120 giờ; tính đủ 24 giờ mỗi ngày thứ Hai–Bảy, bỏ Chủ nhật; Asia/Ho_Chi_Minh. Nhận Chủ nhật bắt đầu thứ Hai 00:00; hạn đúng Chủ nhật 00:00 dời thứ Hai 00:00. Không tính lại khi duyệt | SOURCE QT-04 cho mức giờ/lịch; DESIGN cho thuật toán và biên, không tự thêm giờ hành chính/ngày lễ | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| DD07 | Dùng E04/E05. Thêm device.product_id không FK config; lấy months từ product active tin cậy và lưu tường minh; bỏ DEFAULT 12. Serial UNIQUE, không đổi chủ; AC mới trong phụ lục | DESIGN cho FR02/US02/UC02 và dependency FR04; CS Mục 8 tr. 15 | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| DEP-RANGE | Số tháng nguyên 0–120 thống nhất config/validation/device/snapshot/seed/test | DESIGN, ngưỡng kỹ thuật prototype; không gán cho doanh nghiệp nếu nguồn không quy định | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| DD08 | issue_desc và communication.content sau trim dài 1–2000 Unicode code point; không rỗng/toàn trắng. Đồng bộ SQL/API/frontend và test, không lấy mức tối thiểu 10 của ví dụ bài giảng | DESIGN; BT1/FR02/FR08 yêu cầu không rỗng, API đề xuất ngưỡng; chi tiết Unicode ở TECH-03 | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| AUTH | POST /api/auth/login, scrypt với credential private, random Bearer TTL, session Map một process; principal từ server. Không bảng account/session/token, không refresh/đăng ký/đổi mật khẩu; restart hoặc hết hạn trả 401 | DESIGN dependency đáp ứng đăng nhập cơ bản BT2 tr. 4/NFR02; không thêm FR hoặc mã E14 | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |
| CRUD | Customer: PATCH full_name/address, DELETE mềm. Device: PATCH purchase_date, DELETE mềm qua device.deleted_at. Bốn endpoint chỉ NV đúng trung tâm, QL không có quyền ghi; phone/serial không giải phóng. Không chặn vì phiếu mở/tham chiếu; ticket cũ, E11/E13 vẫn dùng được khi hợp lệ, snapshot bất biến | DESIGN bổ sung để đáp ứng hai thực thể CRUD của BT2 tr. 3/8; giữ SOURCE QT-13/14/15; không sửa contract v0.1 | **ĐÃ ĐƯỢC SINH VIÊN CHẤP THUẬN** |

## 3. Những quyết định baseline đã đủ căn cứ

| Mã | Kết luận / căn cứ | Tác động thiết kế |
| --- | --- | --- |
| DD01 | BT1 Mục 8.1 tr. 23–24 đã có tạo phiếu Mới rồi chờ duyệt khi thiếu ngày mua; API biểu diễn CHUA_XAC_MINH/CHO_PHE_DUYET/can_proceed=false | Không từ chối intake thiếu ngày mua; CHECK cho phép cả chờ và đã duyệt khi snapshot ngày mua/expiry NULL |
| DD04 | API quy định actor/time do server cấp, preview không quyết định POST | now truyền vào service để test; received_at TIMESTAMPTZ, assessed_on DATE theo múi giờ thiết kế; E08 tính lại |
| DD09 | BT1/DDL có approved_by/at và bảng communication; API tách phê duyệt/trao đổi/log | Lưu approval trên ticket, communication nối tiếp; không log chuyển trạng thái giả, không sửa SLA/snapshot khi duyệt |
| DD10 | API/NFR02 yêu cầu Bearer và quyền server | AUTH hiện đã được duyệt; không tin role/center/actor/time trong request |
| SCHEMA-OWN | BT1 không lưu ticket.customer_id; prototype cấm đổi chủ thiết bị | Suy ra qua ticket.device_id→device.customer_id; không thêm cột trùng; kiểm request customer_id đúng chủ |
| CATEGORY-LABEL | DDL giữ sáu mã, API E06 trả nhãn tiếng Việt theo CS Bảng 3.1 | Serializer map mã→nhãn; không bảng i18n, không tự gán default_priority thay input |
| ROLE-DOC | E10/E12 và ma trận API đã cho QL đọc; actor/UC BT1 chưa đồng bộ | Dùng đúng quyền API đã chọn. Đồng bộ hồ sơ gốc là tác vụ riêng trước bài nộp, không là quyết định quyền đang mở |

## 4. Chi tiết kỹ thuật do Codex chọn trong phạm vi ủy quyền

Các mục TECH là **DESIGN kỹ thuật**, không tự gán thành QT hoặc xác nhận riêng của sinh viên. Không thay đổi nghiệp vụ đã chốt.

| Mã | Lựa chọn | Lý do / giới hạn |
| --- | --- | --- |
| TECH-01 | TTL 3600 giây; tối đa 100 session; dọn lúc login/lookup và mỗi 60 giây; randomBytes(32) dạng base64url, Map khóa SHA-256 digest token | Giới hạn bộ nhớ demo, hết hạn tại now>=expires_at; SHA-256 dùng cho token entropy cao, không cho mật khẩu. Đầy sau dọn trả 503 AUTH_CAPACITY_REACHED |
| TECH-02 | Node.js async scrypt: N=32768,r=8,p=1,keylen=64,maxmem=64 MiB; salt ngẫu nhiên >=16 byte; timingSafeEqual sau kiểm độ dài | Hash/salt private theo README tương lai; validate tham số và không ghi plaintext/hash/salt/token vào log. Chưa chạy KDF hoặc sinh credential thật |
| TECH-03 | Trim theo tập 25 code point ECMAScript; đếm Unicode code point bằng Array.from(text).length; không normalize NFC; từ chối NUL/unpaired surrogate trước DB | SQL dùng char_length(btrim(text,U&'...')) cùng tập trim. Emoji có thể khác UTF-16 length; tổ hợp dấu tính từng code point; frontend dùng cùng quy ước |
| TECH-04 | PATCH thành công 200; DELETE 204 không body; DELETE lặp cùng scope/path 204, giữ timestamp đầu | Đã xóa trước khi PATCH bắt đầu→404; đã thấy active nhưng bị xóa trước guard/khóa→409 RESOURCE_CHANGED; PATCH đồng thời tuần tự, trường gửi sau cùng thắng; không version column/ETag |
| TECH-05 | DELETE device vẫn được phép nếu customer đã soft delete, sau kiểm quan hệ/center; không cascade | Cho phép ngừng thiết bị còn lại, giữ quyền truy cập hồ sơ lịch sử. Không mở khôi phục/xóa vật lý |
| TECH-06 | Khóa hàng theo customer→device→category khi tạo mới; E11/E13 chỉ khóa ticket cần thao tác, cùng connection với transaction | Phân biệt intake cần cha active với ticket lịch sử không phụ thuộc deleted_at của cha; không có khóa config vì config bất biến |
| TECH-07 | Config có version/ID ổn định, startup validate và đối chiếu ID DB kể cả tombstone/lịch sử; cập nhật ngoại tuyến có kiểm soát và restart | **Bỏ reference_config_version/reference_config_fingerprint trong schema_migration.** Không tự nhận diện được tái dùng cùng ID trái quy trình; ghi giới hạn này thay vì thêm metadata/bảng |
| TECH-08 | schema_migration chỉ version/name/checksum/applied_at; SQL 001 sáu bảng rồi 002 năm index; runner kiểm checksum và tuần tự, seed fixture lõi sau config | Chỉ chiến lược Phase 2, chưa tạo runner/migration/seed. Mã phiếu dùng sequence, không COUNT+1; seed có natural key và không ghi đè thao tác demo |

## 5. Ma trận trạng thái hiện hành

| warranty_status | approval_status | can_proceed | Snapshot / metadata |
| --- | --- | --- | --- |
| CON_BAO_HANH | KHONG_CAN | true | Có ngày mua/expiry, assessed_on<=expiry; không approval actor/time/note |
| HET_BAO_HANH | KHONG_CAN | true | Có ngày mua/expiry, assessed_on>expiry; không approval actor/time/note |
| CHUA_XAC_MINH | CHO_PHE_DUYET | false | Ngày mua/expiry NULL; không approval actor/time/note |
| CHUA_XAC_MINH | DA_PHE_DUYET | true | Ngày mua/expiry vẫn NULL; có approved_by/approved_at; note tùy chọn |

Không còn quyết định nghiệp vụ đã được duyệt bị để mở. Không có blocker thiết kế ảnh hưởng schema/migration. Kiểm PostgreSQL/API/config/KDF/migration/seed thật thuộc giai đoạn hiện thực; chưa chạy trong Phase 1 và không được coi là đã PASS.

## 6. Lịch sử cập nhật

- 2026-10-23, lượt đầu: lập thiết kế từng phần, để mở các DD/policy thiếu xác nhận.
- 2026-10-23, lượt “Hoàn thiện Phase 1 theo Phương án A (Minimal Backend)”: chốt DEP-A; thời điểm đó các DD/AUTH/CRUD khác còn mở và fingerprint còn là đề xuất.
- 2026-10-23, lượt **“Chốt các quyết định thiết kế và hoàn tất Phase 1”**: sinh viên chấp thuận các DD/DEP-RANGE/AUTH/CRUD liệt kê tại Mục 2; cập nhật DDL/phụ lục, bỏ fingerprint và hoàn tất baseline thiết kế. Các trạng thái ở hai lượt cũ là lịch sử, đã được kết luận hiện hành thay thế.

Điều kiện tiếp tục: có yêu cầu riêng bắt đầu Phase 2. Chấp thuận thiết kế không tự cấp lệnh triển khai Phase 2.

## 7. Phase 2 — Foundation được giao và kiểm chứng ngày 2026-10-24

Sinh viên đã giao rõ Phase 2 trong yêu cầu “Triển khai Phase 2: Backend Foundation” và bổ sung database local riêng. Điều kiện ủy quyền tiếp tục ở Mục 6 đã được đáp ứng cho Phase 2; không tự chuyển sang Phase 3. Các quyết định nghiệp vụ Phase 1 giữ nguyên, không cần duyệt lại.

| Mã | Chi tiết kỹ thuật hiện thực | Căn cứ / bằng chứng |
| --- | --- | --- |
| P2-DB | pg trực tiếp, biến DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD trong .env local; chỉ chấp nhận loopback và database mekong-mobile-l2. Không GRANT/CREATE DATABASE/DROP DATABASE hoặc reset | Yêu cầu môi trường hiện tại; preflight PostgreSQL 18.6/UTF8 xác nhận quyền trước migration. Không ghi mật khẩu/connection string vào tài liệu |
| P2-MIG | 001 giữ DDL sáu bảng; 002 tạo index/sequence mã phiếu; schema_migration chỉ bốn trường. Advisory lock theo database/schema; transaction từng migration, version/name/SHA-256 nội dung chuẩn hóa LF | TECH hiện thực theo Phase 1; DB test sạch/lặp/checksum/runner đồng thời/rollback đều đạt. Không sửa docs/schema.sql hoặc migration đã ghi nhận |
| P2-CONFIG | Config JSON mô phỏng có version; hai center/bốn product/năm account; validate/deep freeze, repository đọc ID lịch sử/tombstone để kiểm compatibility. Không fingerprint hoặc bảng phụ trợ | DEP-A/DEP-RANGE đã duyệt; test config sai và startup từ chối ID thiếu đạt |
| P2-SEED | Fixture v1 cố định 30/30/6/200/200/30; khóa natural key/advisory transaction, không ghi đè thay đổi hợp lệ. Xung đột owner/product/quan hệ hoặc thiếu log đầu thì rollback; không tự sửa lịch sử | Thiết kế Phase 1; seed public hai lần và test bảo toàn chỉnh sửa/phiếu vận hành xen giữa đều đạt |
| P2-AUTH | HTTP A01 đúng phụ lục; private scrypt credential, session digest Map, TTL3600/cap100/sweep60. Script tạo password ngẫu nhiên và hash/salt; password demo chỉ ở file local private bị ignore để người chạy nhập, không in log | AUTH đã duyệt; unit/HTTP test đúng/sai/inactive/TTL/restart/cap/concurrency/role/scope đạt. Không bảng session/account/token và không cấp quyền từ client |
| P2-TX | withTransaction dùng một client, release sau commit/rollback; rollback lỗi giữ lỗi gốc và hủy connection không an toàn | Unit và PostgreSQL integration test đạt; chưa hiện thực service E08/E11 |
| P2-TEST | Node test runner sẵn có, không thêm framework; test DB tạo schema phase2_test_<random> trong duy nhất database được cấp rồi dọn chính schema đó | Cách ly dữ liệu theo yêu cầu; không reset public/database. 22 unit + 7 HTTP + 14 PostgreSQL subtest đạt; runner DB còn đếm một test cha |
| P2-SCOPE | Xóa router/store thử nghiệm theo ủy quyền; không đăng ký E01–E13/CRUD trong Phase 2. Error PG chung là fallback nền tảng; phase nghiệp vụ sau phải ánh xạ mã riêng đúng contract | Không đổi API/SRS/ERD/Frontend. Route giả kiểm quyền chỉ ở tests, không public |

Thông số kỹ thuật là lựa chọn trong phạm vi đã được giao, không phải QT mới hoặc phê duyệt giảng viên. Báo cáo và giới hạn: [phase-02.md](phase-02.md). Phase 3 chỉ bắt đầu khi sinh viên giao riêng.

## 8. Phase 3 — Customer/Device theo yêu cầu hiện tại (2026-10-24)

Sinh viên đã nghiệm thu Phase2, xác nhận tự chạy các lệnh nền tảng/build/DB và chính thức giao Phase3: E01–E04 cùng bốn PATCH/DELETE đã duyệt. Sinh viên chưa xác nhận đã kiểm Postman đầy đủ. Các quyết định DD/DEP/AUTH/CRUD cũ giữ nguyên, không xin duyệt lại và không gán phê duyệt giảng viên.

| Mã | Chi tiết TECH đã hiện thực | Bằng chứng / giới hạn |
| --- | --- | --- |
| P3-LAYERS | Một router HTTP cho tám endpoint; hai service/hai repository theo Customer/Device; dùng lại auth/validation/error/withTransaction. Không dependency/ORM/schema mới | Type-check/build,14 unit mới và20 tình huống HTTP+PostgreSQL đạt; service không req/res, route không SQL |
| P3-SCOPE | NV active center được kiểm role trước parse và service kiểm lại; SQL scope customer từ principal. Device theo parent/owner, manager403. Phone normalize theo API, mask dùng serializer chung | P3-U01/06–08,I01–04/07; không lộ hồ sơ ngoài scope/tombstone qua existing_customer/device |
| P3-UNIQUE | INSERT thường, UNIQUE PG là hàng rào cuối; chỉ chuyển constraint phone/serial tương ứng thành mã lỗi contract. Đọc hồ sơ collision sau rollback; không upsert UPDATE hoặc đổi owner | P3-I03/07/13/14: hai request một201/một409, cross center không profile |
| P3-LIST | E03 một câu SQL CTE cho parent/count/page, cùng snapshot kể cả trang rỗng. ORDER BY ID số trước paginate; BIGINT ID trả qua kiểm safe integer, offset tính BigInt | P3-I05 kiểm ID99/100, filter exact, page vượt phạm vi; không index mới hoặc đổi contract |
| P3-WRITE | Khóa customer trước device; E04 kiểm parent active trong transaction. PATCH precheck active rồi lock/recheck: mất active409, đã ngừng trước request404. Chỉ field có mặt; DELETE204 lặp giữ timestamp, child DELETE được khi parent tombstone | P3-I09–11/15–18 kiểm tranh khóa thật, rollback, omission và giữ lịch sử |
| P3-ERROR | Bổ sung code404/409 contract và whitelist đúng hai loại existing_* trong error handler; URIError của path malformed trả400 an toàn | Không sửa contract; P3-I03/07/12,U14. AppError không log PG detail hoặc input nhạy cảm |
| P3-APP | Factory auth-only vẫn dùng cho harness regression Foundation; production luôn truyền hai services. Có smoke bản build GET E01/E03 và login thực | Giữ test cũ, chỉ làm rõ tên/comment harness; các E05–E13 không public |
| P3-MANUAL | npm run manual:phase3 tạo schema riêng trong cùng DB, dùng lại .env/credential, cổng3002; stop dọn đúng schema tự tạo. Không ghi public hoặc tạo lại database/account | Helper đã smoke login200/create201/cleanup; README có request Postman cho tám endpoint. Chưa khẳng định sinh viên đã thử Postman |
| P3-PRESERVE | Không migration mới/sửa migration cũ hoặc schema/seed/config; chỉ dùng schema test cho ghi API | Hash toàn bộ hàng bảy bảng public trước/sau khớp, ticket_code_seq giữ nguyên. Public30/30/200 và history không đổi |

Chi tiết kiểm trước/sau, truy vết FR/US/UC/QT và tệp thay đổi: [phase-03.md](phase-03.md). Không còn blocker Phase3; dừng để sinh viên nghiệm thu, Phase4 chỉ bắt đầu khi được giao riêng. Không coi CRUD Backend đạt là đã đạt toàn bộ BT2/NFR/fullstack.

## 9. Phase 4 — Catalog, Warranty & Ticket Creation (2026-10-24)

Sinh viên đã giao rõ E05–E08 sau nghiệm thu Phase3; giữ các quyết định DD/DEP/AUTH/CRUD đã duyệt. Đây là ghi nhận TECH trong phạm vi được giao, không phê duyệt nghiệp vụ mới.

| Mã | Hiện thực TECH | Bằng chứng / giới hạn |
| --- | --- | --- |
| P4-CATALOG | E05 đọc config đã validate/freeze, active và sort ID số trước phân trang; không repository/table product. E06 đọc PostgreSQL, map sáu mã sang nhãn API; không default priority | U01–03,I02/03; config hỏng bị chặn lúc khởi tạo, all-inactive trả danh sách rỗng |
| P4-RULES | assessWarranty/initialApproval và computeDueDate thuần, Clock ngoài domain; DD05 cộng tháng đích/clamp một lần; DD06 đủ24h thứ Hai–Bảy/bỏ Chủ nhật. localDate dùng IANA Asia/Ho_Chi_Minh, timestamp +07:00 theo kỳ hiện đại của prototype |32 unit mới và I04/05/07/10/18/20/21; không dependency lịch hay giờ hành chính |
| P4-INTAKE | Khóa customer→device→category; recheck scope/active/owner, một now sau khóa, snapshot từ device, server actor/status. Ticket+NULL→MOI cùng withTransaction; Location chỉ sau commit | I07–17/19–21; không thêm quy tắc một phiếu mở; category FOR SHARE ngăn UPDATE inactive trong transaction |
| P4-CODE | Dùng ticket_code_seq đã có, BH-counter/năm địa phương, tối thiểu6/tối đa12 chữ số, không reset năm; sequence gap sau rollback hợp lệ | I12/13/18, UNIQUE và MAXVALUE migration002 giữ nguyên |
| P4-LAYERS | Service chọn approval_status qua domain; repository chỉ lưu field và ghi log. Dùng lại Customer/Device repository, auth/error/validation/transaction; app nhận tùy chọn services cho harness từng phase, production lắp đầy đủ tới E08 | Regression Phase2/3 và build đạt. findCategory bind bigint để ID JSON an toàn vượt INT4 vẫn ra400 category không hợp lệ |
| P4-MANUAL | Mở rộng cùng helper manual-phase3.ts bằng tham số4, schema/cổng riêng; dùng lại .env/credential, cleanup chính schema tự tạo. Không framework mới | manual:phase4 đã smoke login/catalog/warranty/create/log/cleanup; sinh viên chưa xác nhận tự chạy Postman |
| P4-PRESERVE | Không thêm dependency/migration/schema/table; không sửa config/seed/.env/credential/Frontend/contracts hoặc nguồn. Count+SHA256 toàn bộ hàng7 bảng public và ticket_code_seq trước/sau khớp | Báo cáo [phase-04.md](phase-04.md); bộ tự động chỉ ghi schema cách ly |

Kết quả cuối và26 điều kiện nghiệm thu tại [phase-04.md](phase-04.md). Dừng sau Phase4; E09–E13/Phase5–6 cần yêu cầu tiếp theo. Không kết luận toàn bộ BT2/NFR từ Backend này.

## 10. Phase 5 — Warranty Approval & Communications (2026-10-24)

Sinh viên nghiệm thu Phase4 và chính thức giao E09–E13. Giữ toàn bộ DD/DEP-A/AUTH/CRUD,8 FR/US và ma trận API/phụ lục đã duyệt. Không quyết định nghiệp vụ mới cần hỏi lại.

| Mã | TECH đã hiện thực | Bằng chứng / giới hạn |
| --- | --- | --- |
| P5-QUERY | E09 scope ticket.center_id trước lọc CHUA_XAC_MINH/approval và page; E09/E12 một SQL CTE cho quyền/count/data cùng snapshot. Sort timestamp rồi ID số, offset BigInt | I02/03/13/17/21; ranh ticket999/1000, communication99/100 trong schema test, empty/out-of-page hợp lệ |
| P5-HISTORY | E10 JOIN device→customer không lọc tombstone cha; trả snapshot ticket và profile hiện tại, tái sử dụng maskPhone. can_proceed nhận cả KHONG_CAN/DA_PHE_DUYET; approval timestamp/actor nullable đúng kiểu | U06–08,I04–06/16/20; không gọi warranty/SLA/clock để tính lại khi đọc |
| P5-APPROVAL | E11 role QL, scope từ principal, lock ticket rồi kiểm CHUA+CHO+MOI; UPDATE chỉ4 metadata với guard, kiểm row trả về. Commit trước response; SQL lỗi an toàn500 giữ cause nội bộ | U05/11/12,I07–12/19; hai manager một200/một409 ALREADY_APPROVED, không log giả/ghi đè lần đầu |
| P5-COMM | E12 NV/QL đọc, E13 chỉ NV; E13 lock ticket rồi INSERT cùng actor/time server. Không cần đã duyệt, cha ngừng không cấm lịch sử; không sửa ticket hoặc gửi tin ra ngoài | U03/13–15,I13–20; Unicode1–2000, rollback CHECK, đồng thời10 message không mất dữ liệu |
| P5-APP | Production lắp đủ E01–E13, dùng chung TicketService cho intake/history; factory tùy chọn giữ harness từng phase cũ. Không sửa expected của test Phase2–4 | Regression75 test unit/HTTP và56 PG subtest cũ vẫn đạt; tổng90 và78 sau mở rộng |
| P5-NFR02 | Nhóm riêng9 lượt trái quyền, status và hash7 bảng trước/sau từng lượt được ghi. Account deactivation qua adapter mutable chỉ trong test; config production frozen, thay config theo quy trình restart |9/9 bị từ chối,0/9 trái quyền thành công; không suy bảo mật tuyệt đối từ bộ hữu hạn |
| P5-MANUAL | Tái sử dụng manual-phase3.ts với tham số5/cổng3004/schema riêng, credential hiện có, cleanup chỉ schema do tiến trình tạo | Smoke E08→E13, duyệt lại409, snapshot/SLA/log và cleanup PASS; sinh viên chưa xác nhận Postman |
| P5-PRESERVE | Không dependency/bảng/migration mới; không sửa contract, schema, seed/config, Frontend, .env/credential, test cũ hoặc nguồn | Count+hash7 bảng public và ticket_code_seq trước/sau khớp; tệp baseline được so SHA256, chi tiết phase-05.md |

Báo cáo [phase-05.md](phase-05.md) có32 tiêu chí, truy vết và bằng chứng NFR02. Dừng sau Phase5; không tự làm Phase6 hoặc kết luận NFR01/NFR03/fullstack/toàn bộ BT2.



## 11. Phase 6 — Integration, Packaging & Reproducibility (2026-10-25)

Sinh viên nghiệm thu Phase5 và cho phép Frontend tối thiểu, Docker, test, tài liệu và dự thảo AI; vẫn cấm Git, chỉnh contract/SRS/migration cũ, public data/credential. Không có quyết định nghiệp vụ mới.

| Mã | TECH / DESIGN | Kiểm chứng |
| --- | --- | --- |
| P6-UI | Giữ Next/React/TS, ba màn hình theo yêu cầu Phase6; điều chỉnh wireframe theo quyền E09 hiện hành | UI02/03/04; TD-13 ghi rõ khác biệt |
| P6-CLIENT | Một client HTTP, runtime DTO, token closure RAM; proxy cùng origin allowlist, server target riêng | 12 client tests + TC01–12 qua HTTP/PG; 401 thật sau restart |
| P6-MEASURE | performance.now từ handler lookup đến DOM commit +2RAF; đúng200 ticket/100 lượt/1warmup ngoài mẫu | UI01, raw nfr01-local.json; không suy ra production/load test |
| P6-COMPOSE | Chỉ DB host database khi L2_DEPLOYMENT=compose; local vẫn loopback; DB name không đổi; 3dịch vụ/2volume, credential mới riêng | config guard, Compose healthy, API/UI/restart/seed2lần/clean-room |
| P6-INIT | Advisory lock toàn chuỗi initialize, không ghi đè credential; migrate checksum/seed cũ; startup lỗi không chạy API | initializer code và lỗi config runtime; seed checksum/idempotency regression |
| P6-TEST | Node test runner cũ + Playwright1.64.1 devdependency; test schema tự tạo, one-command fail-fast | 94 unit/HTTP,90 PG subtest,12 client,4 UI; local và container |
| P6-PATCH | body-parser gián tiếp2.4.0, chỉ safe decoder400, không đổi direct dependency/API/old tests | packaging.http.test.ts và npm audit, xem advisory trong Phase6 |
| P6-REPRO | Clean-room copy không Git, loại secret/deps/build, env và volume mới, làm đúng README hai lệnh startup | Phase6 mụcG/H, artifact verification-summary.json |

Kết quả cuối tại [phase-06.md](phase-06.md). Git/commit/tag/nộp bài và xác nhận cá nhân trong AI disclosure thuộc sinh viên, không được khai PASS thay.

## SC-DB — Trung tâm bảo hành lưu PostgreSQL (2026-10-25)

**Đã được sinh viên giao và chốt:** chuyển trung tâm sang PostgreSQL; trong câu hỏi làm rõ chọn chỉ chuyển hai trung tâm hiện có, chưa nhập sáu trung tâm CSV. Quyết định này thay phần centers của DEP-A/TECH-07; sản phẩm/tài khoản/membership giữ config.

- **DESIGN:** thêm một danh mục service_center với ID/tên/trạng thái; migration003 backfill đúng1/2, thêm hai FK từ customer/ticket, không sửa001/002 hoặc dữ liệu lõi. Tổng sáu bảng lõi + một danh mục phụ thuộc + một bảng kỹ thuật; không mở module mới.
- **IMPLEMENTATION:** bỏ centers khỏi JSON, tăng version2; loadReference đọc repository DB, auth đọc is_active từng login/request, E08 recheck/SHARE trong transaction. Validate membership/active center lúc startup tiếp tục; tên được nạp lại khi startup. Migration/seed không ghi đè center đã sửa.
- **Phạm vi:** không nhập dataset, không thay account/password/membership/API/frontend/SRS/ERD gốc, không Git. Căn cứ danh mục phục vụ L2 và QT-14/FR01/05/06; không tạo QT/endpoint mới.
- **Kiểm chứng:** xem [báo cáo và kết quả thật](service-centers-postgresql.md); lịch sử các phase trước giữ nguyên.
