# Backend L2 — Foundation, Customer/Device và tiếp nhận bảo hành

Phase 6 giữ E01–E13 và bốn PATCH/DELETE Customer/Device, tích hợp ba màn hình Next qua API client. PostgreSQL là nguồn dữ liệu; API login và quyền server được dùng lại. Hướng dẫn fullstack/Compose và một lệnh test ở [README root](../../README.md).

Đã kiểm thực tế ngày 2026-10-24: Node.js 24.18.0, npm 12.1.0, PostgreSQL 18.6, database UTF8. Dùng npm và driver pg trực tiếp; không ORM. Cần Node.js >=24.18.0 để chạy TypeScript trực tiếp và API Unicode đang sử dụng.

## Chuẩn bị

Mở terminal tại thư mục này (src/backend). PostgreSQL local phải có sẵn database riêng tên mekong-mobile-l2 và tài khoản được chủ máy cấp quyền. Mã nguồn chỉ chấp nhận host localhost/127.0.0.1/::1 và đúng database này; không tạo database hoặc thay quyền.

Quyền cần cho migration: CONNECT database, USAGE/CREATE schema public và quyền sở hữu/ALTER customer, ticket để thêm FK; tài khoản đang dùng đã thực hiện thành công. Seed cần SELECT/INSERT/UPDATE trên sáu bảng và USAGE/SELECT sequence; tài khoản chạy migration sở hữu đối tượng vừa tạo có các quyền này. Integration test cần thêm CREATE trên chính database để tạo schema cách ly. Không tự GRANT, DROP hoặc reset database.

## Thiết lập và chạy trong bốn bước

1. Cài dependency đúng lockfile:
   ~~~powershell
   npm ci
   ~~~

2. Trên máy mới, sao chép .env.example thành .env, điền DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD theo cấu hình local được cấp:
   ~~~powershell
   Copy-Item .env.example .env
   # Sửa .env bằng editor trước bước 3.
   ~~~
   Nếu đã có .env/credential local, giữ nguyên chúng; không sao chép đè hoặc tạo lại. .env.example chỉ có placeholder, không có mật khẩu thật. .env và mọi thư mục .private bị root .gitignore loại trừ.

   Lệnh setup sinh password ngẫu nhiên riêng cho mỗi account, scrypt hash/salt trong .private/credentials.json và bản password chỉ để demo trong .private/demo-passwords.local.json. Cả hai là file local private, không đưa lên kho mã, chia sẻ hoặc dán vào log/báo cáo. Mở file private bằng editor khi cần nhập mật khẩu demo; chương trình không in password/hash/token. Setup không ghi đè file đã tồn tại.

3. Kiểm kết nối/quyền, chạy migration, tạo credential nếu là môi trường mới rồi seed:
   ~~~powershell
   npm run db:check
   npm run db:migrate
   # Chỉ khi chưa có credential: npm run credentials:setup
   npm run db:seed
   ~~~
   Chỉ tiếp tục khi db:check thành công. Chạy migrate lần hai trả applied_versions rỗng. Seed lần hai không tạo trùng hoặc ghi đè vận hành. Không chạy docs/schema.sql trực tiếp lên database đã có bảng.

4. Khởi động:
   ~~~powershell
   npm run dev
   ~~~
   Backend mặc định lắng nghe http://127.0.0.1:3001, CORS cho http://localhost:3000. Để dùng bản build:
   ~~~powershell
   npm run build
   npm start
   ~~~
   Ctrl+C/SIGTERM đóng server/session/pool; startup chỉ kiểm migration/config/references, không tự migrate/seed. Bản build đã được smoke test đăng nhập và shutdown trên database dự án.

Bốn bước trên là setup Backend local. NFR03 fullstack được kiểm riêng bằng Compose và bản sao sạch; xem [Phase 6](../../docs/progress/backend/phase-06.md).

## Endpoint login và tài khoản mô phỏng

POST /api/auth/login, Content-Type application/json, body chỉ gồm username/password. Username trim và case-sensitive; password giữ khoảng trắng, không normalize. Không nhận query/field lạ. Theo [phụ lục API](../../docs/api-contract-l2-extension.md), thành công 200 với data.access_token/token_type/expires_in/expires_at/principal, Cache-Control: no-store. Không in response chứa token ra log.

| Username demo | Role | Active center | Allowed centers |
| --- | --- | --- | --- |
| nv_demo_a | NHAN_VIEN_TIEP_NHAN | 1 | 1 |
| nv_demo_b | NHAN_VIEN_TIEP_NHAN | 2 | 2 |
| ql_demo_a | QUAN_LY_TTBH | 1 | 1 |
| ql_demo_ab | QUAN_LY_TTBH | 1 | 1,2 |
| inactive_demo | NHAN_VIEN_TIEP_NHAN, inactive | 1 | 1 |

Không dùng token tĩnh/JWT. Token random 32 byte dạng base64url; server chỉ giữ SHA-256 digest cùng employee ID/expiry trong Map. TTL mặc định 3600 giây, tối đa 100 session; dọn lúc login/lookup và mỗi 60 giây. Hết hạn tại đúng biên hoặc restart trả401; đầy session trả503 AUTH_CAPACITY_REACHED. Có thể đổi AUTH_TTL_SECONDS/AUTH_MAX_SESSIONS cho demo/test; cap cấu hình chỉ trong 1–100, default giữ đúng phụ lục.

Account không tồn tại/sai password/inactive cùng401 INVALID_CREDENTIALS. Middleware không tin role/center client khai; NV chỉ active center, QL chỉ allowed centers. requireRole kiểm quyền endpoint riêng, requireResourceScope kiểm phạm vi trả404, requireCreateCenter chỉ kiểm phạm vi trung tâm tạo chứ không tự cấp quyền ghi. Tám endpoint Phase 3 yêu cầu Bearer token và vai trò nhân viên tiếp nhận; quản lý không được hưởng quyền ghi của nhân viên. Các route giả kiểm quyền chỉ nằm trong tests.

Hash mật khẩu dùng async scrypt N32768/r8/p1/keylen64/maxmem64MiB, salt ngẫu nhiên16 byte; kiểm định tham số/hash/salt khi startup, so sánh timingSafeEqual. Tham số kỹ thuật đã chốt Phase1, không dùng SHA-256 thay password hashing.

## Cấu trúc và dữ liệu

- src/app.ts đăng ký login, tám endpoint Phase3, bốn endpoint Phase4, năm endpoint Phase5 và middleware; src/server.ts kiểm foundation trước listen, lắp services/repositories và quản lý shutdown.
- routes/customer-device.routes.ts xử lý HTTP; services/customers.service.ts và devices.service.ts kiểm quyền/owner/product/soft delete; repositories/customers.repository.ts và devices.repository.ts dùng SQL tham số hóa. Route không SQL, service không req/res. E03 dùng một query snapshot cho parent/count/trang và sort ID số.
- customer-device.validation.ts chuẩn hóa phone/ngày/body; customer-device.dto.ts trả đúng field, che phone và timestamp +07:00. PATCH chỉ field có mặt; DELETE204 lặp giữ timestamp, không cascade/history update.
- routes/tickets.routes.ts xử lý E09–E13; tickets.service.ts điều phối query/phê duyệt/trao đổi; tickets.repository.ts và communications.repository.ts thực hiện SQL. E09/E12 dùng một query CTE cho quyền/count/page; E10 không lọc tombstone của cha.
- src/auth.ts và credentials.ts xử lý login/session/principal/password; không truy cập bảng account.
- src/reference-config.ts kiểm kiểu/ID/username/role/membership/months, deep freeze; repositories/reference.repository.ts đọc ID phụ trợ đã được DB tham chiếu.
- src/db.ts quản lý pool/preflight/transaction. Mọi bước trong withTransaction dùng cùng client, rollback lỗi vẫn giữ lỗi gốc và hủy connection không an toàn.
- src/migrate.ts quản lý version/name/SHA-256/applied_at. Checksum tính từ nội dung SQL UTF8 chuẩn hóa LF; không sửa migration đã áp dụng.
- migrations/001_core_schema.sql giữ DDL sáu bảng của Phase1. 002_indexes_and_ticket_sequence.sql tạo năm index và sequence mã phiếu bắt đầu1000000, tối đa12 chữ số, không reset năm.
- src/seed.ts chứa fixture v1 cố định, không phải service bảo hành/SLA của Phase4. Khóa fixture bằng phone/serial/category code/ticket code, khóa transaction chống chạy seed chồng; không COUNT+1 hoặc DO UPDATE reset dữ liệu.
- config/reference.demo.json là dữ liệu mô phỏng có version: hai trung tâm, bốn sản phẩm (gồm0/120 tháng và inactive), năm account/membership. Không tuyên bố lấy từ CSV thật.

Database có sáu bảng customer/device/issue_category/ticket/ticket_status_log/ticket_communication và đúng một bảng kỹ thuật schema_migration. Có năm FK lõi; không FK tới config và không bảng product/center/employee/session/token. ID phụ trợ đã dùng, kể cả tombstone/actor inactive, phải còn trong config. SQL trực tiếp ngoài Backend có thể bỏ qua kiểm tham chiếu phụ trợ.

Khi cập nhật config: dừng Backend, so bản cũ/mới theo ID, không tái dùng ID đã dùng, tăng version, giữ entry inactive cho lịch sử, chạy kiểm references rồi restart. Không fingerprint hoặc metadata config trong bảng migration. Không tự sửa snapshot/device months theo product config mới.

Seed sạch tạo30 customer/30 device/6 category/200 ticket/200 initial log/30 communication; có bốn tổ hợp warranty/approval, tháng0/120, hai trung tâm, hồ sơ ngừng và actor lịch sử inactive. Mã phiếu demo BH-900001/2026..BH-900200/2026 dành riêng, không xung đột sequence runtime. Snapshot seed là dữ kiện cố định tại ngày2026-09-28, không tính lại theo ngày hiện tại.

Seed chạy lại giữ nguyên full_name/address/purchase_date/deleted_at/approval/snapshot/history đã sửa. Nếu natural key bị dùng cho owner/product/quan hệ khác hoặc ticket fixture thiếu initial log, seed báo xung đột và rollback, không tự chữa dữ liệu. Bản seed v1 không dùng để khôi phục database.

## Kiểm thử

~~~powershell
npm run typecheck
npm test
npm run test:db
npm run build
~~~

npm test gồm22 unit Foundation,7 HTTP Foundation,14 unit Phase3 và32 unit Phase4,15 unit Phase5 (90 test). Credential ngẫu nhiên trong bộ nhớ, fake clock cho TTL/cap/ngày mua; không dùng credential private để chạy bộ test. npm run test:db bao gồm14 PostgreSQL subtest Foundation,20 tình huống HTTP+PostgreSQL Phase3 và22 tình huống HTTP+PostgreSQL Phase4,22 tình huống HTTP+PostgreSQL Phase5 (78 subtest; runner82 gồm4 test cha), gồm unique/concurrency/soft delete/snapshot/seed không restore. npm run test:db chỉ kết nối database đã chỉ định, tạo schema phase2_test_<id ngẫu nhiên>, migrate/seed/test trong đó rồi dọn chính schema test; không DROP database/public hoặc reset dữ liệu demo. Các test không phụ thuộc số lần đã seed schema public.

PostgreSQL test kiểm migration sạch/lặp/checksum/rollback/runner đồng thời, FK/UNIQUE/CHECK/Unicode, seed lặp và không đè vận hành, transaction ticket+log, ID lịch sử/config và foundation từ chối cấu hình lỗi. Các kiểm Foundation bằng SQL giữ vai trò regression; bộ Phase4 kiểm E08 qua HTTP và PostgreSQL thật. Bộ Phase5 kiểm E11/E13 bằng HTTP, PostgreSQL thật, guarded UPDATE, rollback và tranh khóa.

Kết quả hiện hành ở [báo cáo Phase5](../../docs/progress/backend/phase-05.md); [báo cáo Phase4](../../docs/progress/backend/phase-04.md) giữ kết quả lịch sử; [báo cáo Phase3](../../docs/progress/backend/phase-03.md) giữ kết quả lịch sử; [báo cáo Phase2](../../docs/progress/backend/phase-02.md) giữ kết quả lịch sử của Foundation. Không dùng test placeholder, không báo đạt NFR01/NFR03/UI/fullstack từ các test Backend hiện tại. Nền tảng hiện không có lint config riêng; type-check strict và test là các kiểm tự động đã cấu hình.

Nếu công cụ trong sandbox báo EACCES khi truy cập loopback, cần quyền chạy lệnh local network theo phạm vi. Điều đó khác với quyền PostgreSQL: không sửa role/GRANT hoặc yêu cầu Full access toàn máy chỉ để xử lý sandbox.

## Phase 3 — Tự kiểm chứng bằng Postman

**Dùng môi trường cách ly khi thử ghi dữ liệu**, giữ nguyên bộ demo public. Trong src/backend, dùng lại .env và credential Phase2; không tạo lại database hoặc credential:

~~~powershell
npm run manual:phase3
~~~

Lệnh dùng chính database mekong-mobile-l2 nhưng tạo schema ngẫu nhiên phase2_test_manual_p3_..., migrate/seed và chạy server riêng tại http://127.0.0.1:3002/api (đổi bằng MANUAL_PORT nếu cần). Ctrl+C đóng server/pool và chỉ dọn schema do lần chạy này tạo; dữ liệu manual sẽ mất khi dừng. Không DROP/reset database/public. Nếu cưỡng bức tắt process, schema test có thể còn lại; không tự xóa schema chưa xác định chủ sở hữu.

Trong Postman tạo biến base_url=http://127.0.0.1:3002/api. Lấy password hiện có của nv_demo_a từ file local private bằng editor; không đưa password/token thật vào collection chia sẻ, README hoặc console. Login:

~~~json
{"username":"nv_demo_a","password":"<nhập password local của tài khoản demo>"}
~~~

POST {{base_url}}/auth/login, Content-Type: application/json; kỳ vọng200, data.access_token, token_type=Bearer, expires_in=3600 và principal đúng center1. Đặt access_token vào biến local/private, chọn Authorization → Bearer Token cho các request dưới; không in token ra log. Token cần được lấy lại sau restart.

POST/PATCH dùng Content-Type: application/json. DELETE không gửi body; GET chỉ dùng query. customer_id/device_id lấy từ response tạo mới, không giả định ID của seed.

| Bước / endpoint | Query hoặc JSON body mẫu | Kết quả cần quan sát |
| --- | --- | --- |
| E02 POST /customers | {"full_name":"Khách manual","phone":"0887654321","address":null} |201; lưu customer_id, phone=088****321; không center_id/deleted_at trong response |
| E01 GET /customers | phone=0887654321; thử thêm +84 887.654.321 bằng Params để encode dấu + |200 cùng ID, số che; phone thiếu/sai400; không tồn tại404 |
| E04 POST /customers/{{customer_id}}/devices | {"product_id":101,"serial_no":"MANUAL-P3-001","purchase_date":"2026-09-01"} |201; lưu device_id, months12 từ config; bỏ ngày/null cũng hợp lệ |
| E03 GET /customers/{{customer_id}}/devices | page=1&size=20; thử serial_no=MANUAL-P3-001 |200 data[],meta; ID tăng dần; trang vượt phạm vi200[] |
| CU PATCH /customers/{{customer_id}} | {"full_name":"Tên đã sửa","address":null} |200; phone/center/created_at không đổi; bỏ address giữ giá trị cũ, null xóa giá trị |
| DU PATCH /customers/{{customer_id}}/devices/{{device_id}} | {"purchase_date":null} |200; chỉ ngày mua đổi, months/product/owner giữ nguyên |
| DD DELETE /customers/{{customer_id}}/devices/{{device_id}} | Không body |204 rỗng, lặp204; E03 ẩn thiết bị; đăng ký lại cùng serial409 |
| CD DELETE /customers/{{customer_id}} | Không body |204 rỗng, lặp204; E01/E03/E04 và PATCH qua customer này404; tạo lại cùng phone409 |

Các POST/PATCH/DELETE trên thực sự ghi PostgreSQL trong schema manual. npm run dev/npm start dùng public; không chạy chuỗi thử ghi trên public nếu muốn giữ bộ30 customer/30 device/200 ticket. Bộ test tự động luôn có schema riêng và không dùng schema manual/public làm fixture ghi.

Thử thêm trước khi DELETE:

- Login nv_demo_b, gọi E03 với customer_id vừa tạo ở center1→404. POST cùng phone→409, không existing_customer hoặc dữ liệu nhận diện của center khác. Login ql_demo_a/ql_demo_ab gọi tám API→403. Thiếu/sai token→401.
- POST trùng phone đang hoạt động đúng scope→409 PHONE_ALREADY_EXISTS với existing_customer đã che phone; dữ liệu tên cũ không bị ghi đè. Sau soft delete vẫn409 nhưng không existing_customer.
- POST device cùng serial/cùng owner→409 SERIAL_ALREADY_EXISTS; customer khác→409 DEVICE_OWNER_MISMATCH, không đổi owner hoặc trả hồ sơ khác. Product104 inactive/product không tồn tại→404 PRODUCT_NOT_FOUND. Product102/103→months0/120.
- Gửi center_id/phone trong PATCH Customer hoặc warranty_months/customer_id trong body Device→400. Body{} PATCH→400. Ngày mua tương lai/ngày không tồn tại→400. Query lặp/lạ→400. Media text/plain cho POST/PATCH→415; DELETE body{}→400 và body text/plain→415.
- Để thử DELETE child sau khi cha ngừng, tạo thêm một customer/device riêng rồi DELETE customer trước: không cascade device, DELETE child đúng owner/scope vẫn204.
- Các ticket seed đã tồn tại vẫn giữ FK/snapshot/approval/status/SLA/log/communication sau PATCH/DELETE. Điều này được kiểm bằng hash và SQL join trong P3-I08–I11/I19; chưa có API ticket E09–E13 để kiểm thủ công trong Phase3.

Hướng dẫn này là đầu vào để sinh viên tự thử Postman, không khẳng định sinh viên đã thực hiện manual verification. Hai thực thể có đủ CRUD ở Backend; các FR/NFR/fullstack và toàn bộ BT2 vẫn cần các phase tiếp theo.


## Phase 4 — Catalog, Warranty và tạo phiếu

E05–E08 đã hiện thực trên cùng Foundation. Warranty là hàm thuần dùng chung cho E07/E08: cộng trực tiếp tháng lịch, clamp ngày cuối tháng, ngày hết hạn vẫn còn bảo hành; dùng tháng đã lưu ở device. E07 chỉ preview; E08 tính lại theo ngày tiếp nhận từ Clock server tại Asia/Ho_Chi_Minh.

E08 khóa Customer → Device → Category, kiểm active/scope/owner rồi tính warranty/SLA. SLA CAO/TRUNG_BINH/THAP =24/72/120 giờ, tính đủ ngày thứ Hai–Bảy, bỏ Chủ nhật; nhận Chủ nhật bắt đầu thứ Hai00:00, hạn đúng Chủ nhật00:00 dời thứ Hai00:00. Không giờ hành chính/ngày lễ. Phiếu và một log NULL→MOI cùng transaction; log lỗi rollback cả phiếu. Mã BH-<counter>/<năm địa phương> từ sequence đã có, không reset năm, rollback có thể để khoảng trống.

| Kết quả bảo hành | approval_status ban đầu | can_proceed |
| --- | --- | --- |
| CON_BAO_HANH | KHONG_CAN | true |
| HET_BAO_HANH | KHONG_CAN | true |
| CHUA_XAC_MINH | CHO_PHE_DUYET | false |

Cả ba trường hợp tạo hợp lệ đều201/MOI; hết hạn không có nghĩa miễn phí. Snapshot/SLA/log cũ không đổi khi PATCH thiết bị hoặc chạy lại seed.

Để thử ghi bằng Postman trong schema riêng, dùng lại helper Phase3:

~~~powershell
npm run manual:phase4
~~~

Mặc định http://127.0.0.1:3003/api, schema phase2_test_manual_p4_<random> trong đúng database dự án. Đổi cổng qua MANUAL_PORT. Dùng lại .env/credential local hiện có; Ctrl+C đóng server/session/pool và dọn đúng schema do lần chạy này tạo. Không thử POST ticket trên npm run dev/npm start nếu muốn giữ nguyên dữ liệu public.

Login theo hướng dẫn trên với nv_demo_a; đặt base_url=http://127.0.0.1:3003/api và Bearer token local/private. Tạo customer/device mới bằng E02/E04 như bảng Phase3; lấy ID thật từ response. POST chỉ nhận đúng sáu field dưới, không actor/time/snapshot.

| Endpoint / thao tác | Input | Kỳ vọng |
| --- | --- | --- |
| E05 GET /products | page=1&size=20 |200 data sản phẩm active, product_id tăng, meta; product104 inactive không trả |
| E06 GET /issue-categories | Không query/body |200 sáu nhãn tiếng Việt; dùng category_id từ response |
| E07 GET /devices/{{device_id}}/warranty | assessment_date=2026-09-28 hoặc bỏ để dùng ngày server |200 đúng assessed_on/expiry/status/requires_approval; không ghi DB |
| E08 POST /tickets | JSON mẫu bên dưới |201, Location=/api/tickets/<ID>, status=MOI, timestamp+07, snapshot đúng |
| E08 thiếu priority | Bỏ priority khỏi JSON |400 VALIDATION_FAILED, fields.priority; không tạo phiếu/log |
| E08 sai center | center_id=2 khi nv_demo_a |403 ROLE_FORBIDDEN |
| E07/E08 ngoài scope | Login nv_demo_b để truy cập device/customer center1 |404; không trả hồ sơ trung tâm khác |
| E07/E08 sau soft delete | DELETE device hoặc customer rồi gọi lại |404; ticket/log/snapshot đã tạo vẫn giữ nguyên |

~~~json
{
  "customer_id": 123,
  "device_id": 456,
  "center_id": 1,
  "issue_desc": "Máy không nhận sạc",
  "category_id": 3,
  "priority": "CAO"
}
~~~

123/456/3 chỉ minh họa: thay bằng ID từ E02/E04/E06. Với ngày mua2026-09-01, product101 và assessment_date2026-09-28: CON_BAO_HANH; ngày mua2020-01-01: HET_BAO_HANH; bỏ ngày/null: CHUA_XAC_MINH, expiryNULL/requires_approval=true. E08 dùng ngày server, không dùng assessment_date preview. Có thể PATCH purchase_date sang null trước E08 để kiểm phiếu CHO_PHE_DUYET/can_proceed=false; helper manual:phase4 chỉ lắp API tới E08; dùng manual:phase5 để thử duyệt.

Manager gọi bốn API trả403; thiếu/sai token401. Priority bắt buộc, category thiếu/inactive400, sai chủ trong cùng center409 DEVICE_OWNER_MISMATCH, field readonly/lạ400, sai media415. GET không nhận body; query lạ/lặp400. E05 không đọc bảng product; config sai bị chặn khi khởi tạo với CONFIGURATION_ERROR, không âm thầm trả danh sách từ cấu hình hỏng. E06 rỗng hợp lệ khi không còn category active.

Helper manual:phase4 chưa lắp GET /tickets/{id}; helper manual:phase5 và production hiện đã có E10 theo Location. Kiểm ticket/log qua bộ PostgreSQL test; hướng dẫn này không khẳng định sinh viên đã chạy Postman.


## Phase 5 — Phê duyệt bảo hành và trao đổi

E09–E13 dùng phạm vi ticket.center_id; Customer/Device đã soft delete không chặn lịch sử của ticket hợp lệ. Ticket đã ngừng hoặc ngoài phạm vi trả404 TICKET_NOT_FOUND.

| Endpoint | Vai trò | Request / kết quả |
| --- | --- | --- |
| E09 GET /tickets | QL trong allowed_center_ids | approval_status mặc định CHO_PHE_DUYET, chỉ thêm DA_PHE_DUYET; page/size theo quy ước. Chỉ CHUA_XAC_MINH, sort received_at rồi ticket_id tăng; total sau lọc scope cùng snapshot |
| E10 GET /tickets/{id} | NV active center / QL allowed centers | Chi tiết từ snapshot đã lưu; customer/device hiện tại, phone NV che/QL đầy đủ đúng scope. Không tính lại warranty/SLA, không ghi khi đọc |
| E11 POST /tickets/{id}/warranty-approval | QL đúng scope | {} hoặc note=null/chuỗi trim1–1000;200 metadata từ server. Chỉ CHUA_XAC_MINH+CHO_PHE_DUYET+MOI; đã duyệt409 ALREADY_APPROVED; không thuộc diện409 APPROVAL_NOT_APPLICABLE |
| E12 GET /tickets/{id}/communications | NV / QL đúng scope | page/size, sort created_at rồi communication_id tăng; ticket chưa có trao đổi200[]/total0 |
| E13 POST /tickets/{id}/communications | NV đúng scope | content trim1–2000 Unicode;201 với communication_id/ticket_id/content/created_at/created_by. Được ghi khi chờ duyệt |

E11 dùng withTransaction, SELECT ticket FOR UPDATE rồi UPDATE có guard, trả200 sau commit. Hai quản lý cùng duyệt chỉ một thành công; metadata lần đầu không bị ghi đè. E13 cũng khóa ticket trong transaction trước INSERT. Cả hai không sửa status/SLA/warranty snapshot và không tạo status log giả. Không gửi SMS/email hoặc cho sửa/xóa trao đổi.

### Postman trong schema cách ly

~~~powershell
npm run manual:phase5
~~~

Dùng lại helper cũ, mặc định http://127.0.0.1:3004/api và schema phase2_test_manual_p5_<random>. MANUAL_PORT có thể đổi cổng. Dùng nguyên .env/credential hiện có; Ctrl+C đóng HTTP/session/pool rồi dọn đúng schema tiến trình đã tạo. Helper Phase3/4 vẫn giữ phạm vi cũ. Không dùng npm run dev/npm start để thử ghi nếu muốn giữ dữ liệu public.

1. Đặt base_url tới cổng3004. Login nv_demo_a theo phần login; giữ token NV ở biến local/private.
2. Theo bảng Phase3 tạo customer/device với purchase_date=null, lấy ID thật. E07 trả CHUA_XAC_MINH; E08 tạo ticket MOI/CHO_PHE_DUYET/can_proceed=false. Lưu ticket_id hoặc Location.
3. E10 với token NV: phone được che, purchase_date_snapshot/expiry NULL. Lưu received_at/due_date/assessed_on/months_snapshot để so sau.
4. POST /tickets/{{ticket_id}}/communications với body {"content":"Khách chưa tìm được hóa đơn"}; kỳ vọng201. GET cùng đường dẫn?page=1&size=20 đọc lại200, đúng actor/time.
5. Login ql_demo_a, giữ token QL riêng. GET /tickets?approval_status=CHO_PHE_DUYET tìm ticket; GET /tickets/{{ticket_id}} xem chi tiết/phone theo quyền.
6. POST /tickets/{{ticket_id}}/warranty-approval với body {"note":"Cho phép tiếp tục xử lý L2"} hoặc {}; kỳ vọng200/DA_PHE_DUYET/can_proceed=true. approved_by/approved_at do server gán.
7. Đọc lại E10/E12; warranty_status vẫn CHUA_XAC_MINH, status vẫn MOI, snapshot/SLA không đổi, trao đổi còn nguyên. E09 lọc DA_PHE_DUYET thấy ticket. Duyệt lại409 ALREADY_APPROVED và giữ metadata đầu.
8. Để thử outside scope, tạo ticket center2 bằng nv_demo_b: ql_demo_a đọc/duyệt/đọc trao đổi ticket đó404; ql_demo_ab được đọc/duyệt. QL gọi E13 luôn403; NV gọi E09/E11 luôn403; thiếu/sai token401.
9. Để thử lịch sử, dùng token NV soft delete Customer/Device nguồn của một ticket còn chờ. E10/E12 vẫn đọc, E13 vẫn ghi; QL đúng scope vẫn E11 được. Hồ sơ nguồn không được phục hồi và snapshot/SLA không thay đổi.

POST dùng application/json; GET không body. Query lạ/lặp, field actor/time/readonly, note rỗng/1001 hoặc content rỗng/2001 đều400; sai media415. Không dán token/password vào collection chia sẻ hoặc log. E11 trên ticket CON/HET_BAO_HANH409, không biến thành phê duyệt miễn phí.

Test tự động kiểm9 lượt trái quyền NFR02, DB trước/sau bất biến; không suy ra bảo mật tuyệt đối từ tập hữu hạn. Hướng dẫn này chưa phải xác nhận sinh viên đã chạy Postman. Báo cáo kết quả: [Phase5](../../docs/progress/backend/phase-05.md). NFR01/UI, NFR03/fullstack/Docker và nghiệm thu tổng thể BT2 chưa được kết luận trong Phase5.

## Tài liệu và khai báo AI

[Thiết kế Phase1](docs/backend-architecture-phase-01.md), [mapping](docs/contract-schema-mapping.md), [decision log](../../docs/progress/backend/decision-log.md), [API gốc](../../docs/api-contract-l2.md), [phụ lục](../../docs/api-contract-l2-extension.md). Giữ đúng E01–E13, login và bốn CRUD đã duyệt; không sửa contract theo mã hoặc mở rộng ra ngoài L2.

Tham chiếu kỹ thuật: [node-postgres transaction cùng client](https://node-postgres.com/features/transactions), [Node.js scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). Nội dung hỗ trợ AI và các bước sinh viên cần tự kiểm chứng được đề xuất trong báo cáo; không tự khai sinh viên đã kiểm chứng.

## Bổ sung Phase 6

Root README là hướng dẫn fullstack chuẩn. L2_DEPLOYMENT mặc định local, chỉ DB loopback; compose chỉ DB_HOST=database và listen0.0.0.0 trong container, tên DB vẫn mekong-mobile-l2. Không trỏ host.docker.internal/database development. compose-start chạy preflight và advisory lock cho cả credential/migrate/seed; local server không tự migrate/seed.

Docker image Backend user node; credential mới trong volume private, không trong image/seed/env example. Healthcheck kiểm DB/checksum và HTTP401 của API có auth. Startup config/migration lỗi không chạy server.

Phase6 thêm packaging guards/gzip400 và12 case frontend-client→HTTP→PG. Test:db dùng --env-file-if-exists để chạy cả local và env container. Một lệnh từ root chạy mọi nhóm và trình duyệt. Kết quả: [Phase6](../../docs/progress/backend/phase-06.md).

Dependency gián tiếp body-parser được vá2.4.0 theo [advisory chính thức](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828); Express/direct stack giữ nguyên. Decoder400 trả envelope an toàn, không phản chiếu thông báo thư viện.

## Trung tâm bảo hành trong PostgreSQL — cập nhật sau FE-07

`service_center(center_id,center_name,is_active)` là danh mục phụ thuộc mới. Migration003 chuyển đúng hai trung tâm demo, giữ ID/tên và thêm FK customer.center_id/ticket.center_id ON DELETE RESTRICT;001/002 không đổi. Backend đã có dữ liệu chỉ migrate rồi restart; không chạy credentials:setup hoặc reset/seed lại để chuyển trung tâm.

`config/reference.demo.json` version2 giữ products/accounts/membership. `loadReference(file,pool)` đọc trung tâm qua repository, ghép cấu hình runtime và kiểm membership; không đọc/fallback danh mục trung tâm từ JSON. Tài khoản/password giữ nguyên. `createDatabaseAuth` kiểm is_active từ DB lúc login và từng request; E08 kiểm/khóa trung tâm trong transaction trước customer/device/category. Ngừng trung tâm làm phiên bị từ chối; hoạt động lại cần login mới nếu token đã bị thu hồi. Startup vẫn chặn account hoạt động trỏ active center ngừng hoặc membership thiếu.

Đổi tên/trạng thái không bị seed hoặc migration lặp ghi đè. Tên được nạp lại ở startup; trạng thái dùng truy vấn DB trực tiếp. Chưa thêm endpoint/CRUD quản trị trung tâm; response A01/E01–E13 và frontend giữ nguyên. Bảy bảng dữ liệu (sáu lõi + trung tâm), một bảng migration kỹ thuật. Sáu trung tâm trong dataset và các CSV khác chưa được nạp.

Kiểm thử SC-I01–07 được import từ `tests/postgres.test.ts`, nên `npm run test:db` và root `npm test` tự chạy, không cần script mới. [Báo cáo](../../docs/progress/backend/service-centers-postgresql.md), [minh chứng](../../docs/tests/backend/service-centers/verification.md).

## CSV-03 — công cụ nhập khách hàng/thiết bị (mốc26/10/2026)

Đã có migration004 email nullable, CLI `npm run db:import -- inspect|dry-run|apply ...`, importer transaction và journal/receipt. Ở mốc CSV-03 chưa apply public/catalog; startup hỗ trợ003 và importer yêu cầu004 khi ghi. CSV-05 bên dưới đã hoàn tất nạp Windows theo giao việc mới.

[Hướng dẫn và lệnh đã kiểm chứng](docs/customer-device-import.md), [báo cáo](../../docs/progress/data-import/csv-03.md). Typecheck/build,108 unit/HTTP và118 PostgreSQL runner tests PASS; bộ thật pilot/full/rerun kiểm ở schema riêng rồi dọn. Các test chuẩn dùng fixture nhỏ, không cần CSV private; không công khai bundle hoặc state.

## CSV-04 — kiểm thử API/UI với pilot đã nạp

Đã kiểm chứng10/10 case pilot100 khách/121 thiết bị bằng API/PostgreSQL/Next.js thật; hồi quy108 unit/HTTP +118 PG runner +45 client +53 browser PASS. Không cần đổi API hoặc mã frontend. [Báo cáo CSV-04](../../docs/progress/data-import/csv-04.md).

Harness `test:csv-ui` là kiểm tra bổ sung, cần nguồn CSV và bundle/manifest pilot CSV-02 private đã chuẩn bị, PostgreSQL có quyền CREATE schema, dependency cả hai phần và Chromium của Playwright. Đọc cấu hình DB từ `.env` backend hiện có. Chạy từ root bằng PowerShell:

```powershell
npm --prefix src/frontend run build
$env:L2_UI_OUTPUT_DIR = Join-Path (Get-Location) 'docs/tests/data-import/csv-04/imported-ui'
npm --prefix src/backend run test:csv-ui
```

Lệnh mặc định đọc manifest/pin trong `docs/tests/data-import/csv-02/manifest-summary.json`, nguồn trong `docs/CDTN1_Mekong Mobile_Dataset Smart CRM/dataset`. Trên checkout khác, chuẩn bị bundle theo [hướng dẫn importer](docs/customer-device-import.md#5-chuẩn-bị-từ-csv-trên-checkout-khác), rồi đặt `L2_CSV_UI_MANIFEST` (đường dẫn tuyệt đối), `L2_CSV_UI_MANIFEST_SHA256` (pin tương ứng) và `L2_CSV_UI_SOURCE_DIR` (thư mục nguồn tuyệt đối). Harness vẫn kiểm integrity và yêu cầu profile100/121; không tự tạo bundle hoặc bỏ qua checksum. Chọn `L2_UI_OUTPUT_DIR` mới để giữ bằng chứng lượt trước.

Harness tự migrate004/seed/import trong schema ngẫu nhiên do nó sở hữu, chạy ứng dụng trên cổng riêng rồi dọn schema/process; không apply public, thay credential hoặc catalog vận hành. Chẩn đoán chi tiết/receipt nằm trong `.private/imports/customer-device/csv-04/runs/`; JSON/log/ảnh chia sẻ được che dữ liệu nhạy cảm. `npm test` ở root vẫn dùng fixture nhỏ, không cần bộ CSV/private này. Public chưa đổi ở mốc CSV-04; kết quả nạp thật CSV-05 bên dưới.

## CSV-05 — dữ liệu CSV đã sử dụng trên Windows

Public đã có migration004/catalog3, nạp51.275 khách/7.414 thiết bị, tổng51.306/7.444 cùng dữ liệu cũ. Phiếu/log/trao đổi200/200/30,2 trung tâm và account/password giữ nguyên. Bảo hành của device CSV chưa xác minh do thiếu ngày mua; email chỉ ở DB. Không import lịch sử phiếu hoặc sáu trung tâm CSV, không nạp Docker.

CLI thêm `--confirm-public mekong-mobile-l2/public`, yêu cầu schema public tường minh, fingerprint dry-run mới, source-dir để kiểm hash và state-dir tuyệt đối/persistent; thiếu điều kiện vẫn từ chối. Giữ transaction/constraint/receipt và không nhận catalog thay thế khi apply public.

Kết quả:109 unit/HTTP,118 PG runner,45 client,53 browser PASS; public smoke `test:csv-live` đạt6/6 pilot và6/6 full, backup trước/sau đã phục hồi thử trong schema riêng rồi dọn. Fixture nhỏ `tests/fixtures/reference.base.json` độc lập catalog vận hành; không đổi assertion cũ hoặc cần CSV lớn cho `npm test` chuẩn.

[Báo cáo CSV-05](../../docs/progress/data-import/csv-05.md), [lệnh kiểm/chạy lại/backup/phục hồi](docs/customer-device-import-operations.md). Hai mẫu tra cứu thực tế ở root `.private/imports/customer-device/csv-05/demo-lookup.local.json`; không chia sẻ file này. Khởi động backend/frontend theo root README như trước, không cần chạy lại import/seed trên máy Windows hiện tại.
