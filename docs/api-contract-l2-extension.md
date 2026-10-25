# Phụ lục API L2 — Login, CRUD và AC thiết bị mới

**Phiên bản:** 1.0 · **Ngày:** 2026-10-23 · **Trạng thái:** baseline thiết kế được sinh viên chấp thuận.  
Nguồn phê duyệt: yêu cầu hiện tại “Chốt các quyết định thiết kế và hoàn tất Phase 1”, Mục 3–8. Đây là phần mở rộng prototype, không phải nội dung gốc của Case Study hoặc [API Contract v0.1](api-contract-l2.md). Không sửa E01–E13, không đánh mã E14 cho login. Các mã A01/CU/CD/DU/DD dưới đây chỉ định danh phụ lục. Chưa có endpoint thực thi hoặc kết quả HTTP test.

## 1. Căn cứ, phân quyền và phạm vi

**SOURCE:** Case Study — Bảng 9.1 — tr. PDF 19 — QT-01/02/03/13/14/15; BT2 — Mục 2.1/S1 — tr.3/8 yêu cầu hai thực thể CRUD; Mục 2.3 — tr.4 yêu cầu đăng nhập cơ bản. Hồ sơ nguồn/BT1 và mã FR/US/UC theo [mapping](../src/backend/docs/contract-schema-mapping.md). **DESIGN:** sinh viên chấp thuận AUTH, CRUD, DD02/03/05/06/07/08 và DEP-RANGE; không gán phê duyệt giảng viên. **TECH:** TTL, mã lỗi và cách xử lý lặp/đồng thời được Codex lựa chọn trong ủy quyền kỹ thuật của yêu cầu hiện tại.

| Mã phụ lục | Method/path sau /api | Nhân viên tiếp nhận | Quản lý TTBH | Không token |
| --- | --- | --- | --- | --- |
| A01 | POST /auth/login | Đăng nhập bằng credential | Đăng nhập bằng credential | Được gửi credential, không cần token |
| CU | PATCH /customers/{customer_id} | Có, active_center_id | 403 | 401 |
| CD | DELETE /customers/{customer_id} | Có, active_center_id | 403 | 401 |
| DU | PATCH /customers/{customer_id}/devices/{device_id} | Có, customer.center_id=active_center_id | 403 | 401 |
| DD | DELETE /customers/{customer_id}/devices/{device_id} | Có, customer.center_id=active_center_id | 403 | 401 |

Principal được server xác lập gồm employee_id, role, active_center_id, allowed_center_ids. Không tin role/actor/center do client gửi. Tài nguyên thiếu/ngoài scope trả404; role gate chạy trước đọc tài nguyên. Với nested device, device không thuộc customer trên path trả404 DEVICE_NOT_FOUND, không tìm rồi trả hồ sơ chủ khác. Không thêm quyền ghi cho quản lý. Ma trận gốc E01–E13 giữ nguyên; QL đọc E10/E12 và phê duyệt E11 trong allowed_center_ids.

## 2. Quy ước request, Unicode và lỗi dùng chung

- Áp dụng envelope thành công `{data: ...}`, lỗi `{error:{code,message,fields}}`, snake_case, ngày ISO, timestamp offset +07:00, ID integer an toàn dương như contract gốc. Lỗi không được chứa credential/token/hash/SQL/stack/phone thô ngoài quyền.
- POST/PATCH phải là JSON object, Content-Type application/json; sai media415 UNSUPPORTED_MEDIA_TYPE, JSON lỗi400 INVALID_JSON; thiếu/sai field hoặc query/path/trường chỉ đọc400 VALIDATION_FAILED. Không nhận query trên năm endpoint phụ lục. DELETE không nhận body; body JSON kể cả `{}` trả400, body không phải JSON trả415. DELETE thành công204 không có response body và không bắt buộc Content-Type khi request rỗng.
- PATCH phải có ít nhất một field được phép. Field bỏ qua giữ nguyên; explicit null chỉ được nhận cho address/purchase_date; full_name null không hợp lệ. Không tự nhận phone, center, actor hay trường chỉ đọc. Không có API restore/purge.
- **Đếm Unicode:** trim theo ECMAScript String.prototype.trim ở hai đầu; sau đó đếm **Unicode code point** bằng `Array.from(text).length`, không dùng `.length` UTF-16 hoặc đếm grapheme. `😀`=1; `e`+combining acute=2; `ế` dựng sẵn=1. Không tự normalize NFC/NFD nên hai cách viết có thể khác số code point; dùng cùng quy ước ở frontend/backend và test. Reject NUL U+0000 và surrogate không ghép cặp với400 trước khi ghi PostgreSQL UTF8.
- Tập trim chốt: U+0009–000D, U+0020, U+00A0, U+1680, U+2000–200A, U+2028/2029, U+202F, U+205F, U+3000, U+FEFF. SQL CHECK dùng char_length(btrim(text, tập ký tự U& đã liệt kê)) cho issue_desc/content, miền1–2000 sau trim. Chuỗi toàn space/tab/newline/NBSP/BOM bị từ chối. Backend lưu giá trị đã trim; không tự trim password.
- full_name: chuỗi sau trim1–120; address: chuỗi sau trim tối đa255 hoặc null; address rỗng được lưu chuỗi rỗng, không tự đổi thành null. purchase_date: ngày YYYY-MM-DD tồn tại trên lịch, hoặc null; không sau ngày server tại Asia/Ho_Chi_Minh. Các ngưỡng và trim áp dụng thống nhất với serializer/validation gốc; không sửa nội dung v0.1.

Đối chiếu kỹ thuật ngày2026-10-23: [ECMAScript trim](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.trim), [PostgreSQL btrim/char_length](https://www.postgresql.org/docs/current/functions-string.html), [Unicode escape U&](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-STRINGS-UESCAPE). Chưa kiểm thực thi DDL trên PostgreSQL; server encoding phải là UTF8 ở Phase2.

### Lỗi dùng chung

| HTTP/code | Ngữ nghĩa |
| --- | --- |
| 400 VALIDATION_FAILED / INVALID_JSON | Input sai; fields chỉ ghi tên trường và hướng dẫn, không phản chiếu dữ liệu nhạy cảm |
| 401 AUTHENTICATION_REQUIRED | Token thiếu/sai/hết hạn/restart; không thay đổi dữ liệu |
| 403 ROLE_FORBIDDEN | Đã xác thực nhưng sai vai trò; không cấp quyền QL ghi CRUD |
| 404 CUSTOMER_NOT_FOUND / DEVICE_NOT_FOUND | Thiếu/ngoài scope; PATCH còn yêu cầu hồ sơ hoạt động; DELETE xử lý tombstone như Mục4 |
| 409 RESOURCE_CHANGED | Request đã quan sát target hoạt động hợp lệ, nhưng bị ngừng trước khi lấy lock/ghi; đọc lại rồi thử. Không dùng để cấm xóa vì ticket đang tham chiếu |
| 415 UNSUPPORTED_MEDIA_TYPE | Có body nhưng sai content type |
| 500 CONFIGURATION_ERROR / INTERNAL_ERROR | Config/DB/lỗi ngoài dự kiến; thông báo chung, log an toàn. Mất kết nối DB không được trả thành công |

Ví dụ409 của request PATCH bị DELETE đồng thời thắng trước:

```json
{"error":{"code":"RESOURCE_CHANGED","message":"Hồ sơ đã thay đổi. Hãy tải lại trước khi thử tiếp.","fields":{}}}
```

409 không phải kết quả bắt buộc của mọi request đồng thời: nếu PATCH bắt đầu sau khi hồ sơ đã ngừng thì404. Khi trạng thái không đổi, hai PATCH hợp lệ được serialize theo khóa, cùng200; cập nhật field có mặt, field trùng dùng lần ghi sau. Không thêm version column/ETag chỉ cho prototype. Cách quan sát trước khóa/recheck cụ thể ở kiến trúc Mục4.

## 3. A01 — POST /api/auth/login

Đây là endpoint hạ tầng AUTH được sinh viên chấp thuận; không tạo FR/US đăng nhập mới và không thuộc13 endpoint nghiệp vụ gốc. Không yêu cầu Bearer token đầu vào.

**Request JSON:**

```json
{"username":"nv_demo_a","password":"<mật khẩu demo do người chạy chuẩn bị>"}
```

username: trim1–64 code point, đối sánh chính xác/case-sensitive; password: chuỗi1–256 code point, giữ khoảng trắng và không normalize; không nhận field khác. Ví dụ là schema minh họa, không phải credential đã cài hay secret để sử dụng thật.

**Response200**, Cache-Control: no-store:

```json
{"data":{"access_token":"<token ngẫu nhiên server cấp>","token_type":"Bearer","expires_in":3600,"expires_at":"2026-10-23T11:00:00+07:00","principal":{"employee_id":12,"role":"NHAN_VIEN_TIEP_NHAN","active_center_id":1,"allowed_center_ids":[1]}}}
```

Các ID/thời điểm là fixture minh họa; expires_at=now+TTL thực. principal trong response chỉ giúp UI hiển thị; request tiếp theo không được dùng principal do UI gửi lại để cấp quyền. Không trả password, salt, password_hash, token digest, file path private hoặc chi tiết account khác.

**TECH cấu hình AUTH đã chốt:** TTL mặc định3600 giây, max100 session trong một process; cấu hình runtime phải là integer dương và test dùng đồng hồ giả. Token randomBytes(32) base64url; Map private lưu SHA-256(token)→employee_id/expires_at. SHA-256 chỉ dùng cho digest token ngẫu nhiên, không dùng thay password hashing. Mỗi request tra token/expiry rồi lấy role/center từ config bất biến; `now >= expires_at` là hết hạn. Restart xóa Map nên token cũ401. Quét session hết hạn trước login, khi lookup và định kỳ60 giây; timer không giữ process sau shutdown. Đủ100 session còn hiệu lực thì login503 AUTH_CAPACITY_REACHED, không đẩy phiên khác hoặc cấp token không lưu; dọn hết hạn xong có thể đăng nhập lại. Không refresh/revoke/logout endpoint mới.

**Credential:** account metadata từ config DEP-A; hash/salt private qua file local/biến môi trường được README Phase2 hướng dẫn, không plaintext/secret thật trong source. Chọn scrypt async chuẩn Node.js, salt ngẫu nhiên tối thiểu16 byte; tham số kỹ thuật N=32768,r=8,p=1,keylen64,maxmem64MiB được ghi với hash và validate khi nạp. So hash cùng độ dài bằng timingSafeEqual; không tự viết thuật toán mã hóa. Backend thiếu/sai credential cấu hình phải dừng trước listen, không phát token cố định. Salt/hash cũng không được log hoặc trả qua API. Tham chiếu [Node.js Crypto](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback); chưa chạy KDF/AUTH ở Phase1.

**Lỗi riêng:**401 INVALID_CREDENTIALS cho username không có, sai password, account inactive hoặc active center không dùng được; cùng thông báo “Thông tin đăng nhập không hợp lệ”, fields={} để không lộ account. Sai cấu trúc credential là lỗi cấu hình, không giả thành sai mật khẩu. 400/415/500 như Mục2, 503 khi đầy session; 403/404/409 không dùng cho login. Authorization header nếu có không thay việc kiểm username/password.

**Đồng thời:** sau khi await scrypt hoàn tất, dọn hết hạn và kiểm lại cap ngay trước Map.set; đoạn kiểm/cấp session này không có await, nên hai login đồng thời không vượt cap100 trong một process. Sinh token trùng digest thì sinh lại trước khi thêm, không ghi đè session khác.

**AC-A01:** đúng credential→200/token ngẫu nhiên; sai tên/sai password/inactive→401 chung; thiếu/trường lạ→400; token sửa/hết hạn tại đúng biên→401; restart→401; sửa role/center trong request không cấp quyền; cleanup và cap100 kể cả login đồng thời không vượt giới hạn; credential thiếu/hash sai định dạng→startup fail; không log/response dữ liệu credential. Mọi test là kế hoạch, chưa chạy HTTP.

## 4. Chính sách soft delete và quyền lịch sử

1. Customer DELETE chỉ SET customer.deleted_at; device DELETE chỉ SET device.deleted_at. Không DELETE vật lý/cascade, không sửa ticket/status/log/communication hoặc giải phóng phone/serial UNIQUE. Không đổi thành DA_HUY, không ghi status log giả.
2. Tạo mới E04/E08 yêu cầu customer hoạt động; E08 còn yêu cầu device hoạt động. E01/E03 và E07 không trả hồ sơ intake đã ngừng; E02 trùng phone vẫn409 và không tạo lại, không lộ hồ sơ ngừng/ngoài scope. Sản phẩm inactive không tạo device mới; không làm mất product_id hoặc months của device đã tồn tại.
3. Ticket còn hợp lệ: E09/E10/E12 vẫn đọc; E11 vẫn duyệt nếu đủ điều kiện gốc; E13 vẫn ghi trao đổi. Chỉ lọc ticket.deleted_at/scope/role/điều kiện endpoint; **không JOIN với điều kiện customer.deleted_at/device.deleted_at IS NULL** để vô tình chặn lịch sử. Customer/device ngừng vẫn được join lấy thông tin và mask phone theo vai trò. Quy tắc không tiếp nhận mới không phải lệnh cấm phục vụ ticket cũ.
4. PATCH chỉ trên customer/device hoạt động, device PATCH yêu cầu cả customer cha hoạt động. DELETE cần target tồn tại trong scope, kể cả tombstone; device DELETE cho phép customer cha đã ngừng để hoàn tất ngừng riêng device. Sai nested ownership404, không chuyển chủ. Đây là chi tiết kỹ thuật tối thiểu của phụ lục.
5. **DELETE lặp:** cùng target đã soft delete, vẫn đúng role/scope/path→204 rỗng, giữ nguyên deleted_at lần đầu. ID không tồn tại/ngoài scope→404. Không trả204 trước xác thực hoặc dùng deleted_at làm cách vượt kiểm quyền. Không cấm DELETE vì có ticket mở hoặc FK đang tham chiếu; quan hệ FK không bị phá vì hàng vẫn tồn tại.
6. PATCH và tạo ticket lấy cùng thứ tự khóa customer→device; DELETE dùng cùng quy ước. Snapshot ticket chụp dữ liệu tại thời điểm serialize giao dịch tạo phiếu; PATCH purchase_date chỉ đổi device cho các lần đánh giá/tiếp nhận sau. Không tính lại snapshot/SLA hoặc tự bỏ cổng phê duyệt của ticket cũ.

## 5. CU — PATCH /api/customers/{customer_id}

**Vai trò:** NV đúng active center; không token401, QL403; ID positive safe integer. Query không được phép. Target không tồn tại/ngoài scope/đã ngừng tại đầu request→404 CUSTOMER_NOT_FOUND.

**Body:** một hoặc cả hai full_name/address theo Mục2, không rỗng object. customer_id/phone/center_id/created_at/deleted_at và field khác chỉ đọc→400. Ví dụ:

```json
{"full_name":"Nguyễn Văn Minh","address":null}
```

**200:** schema Customer đúng E01/E02, phone che với NV:

```json
{"data":{"customer_id":1024,"full_name":"Nguyễn Văn Minh","phone":"085****105","address":null,"created_at":"2026-09-01T10:00:00+07:00"}}
```

Không trả center_id mới như tự mở rộng Customer v0.1, không thay created_at hoặc cập nhật device/ticket. Viết PATCH cùng giá trị vẫn200. Lỗi400/401/403/404/409/415/500 như Mục2; không có PHONE_ALREADY_EXISTS vì không cho sửa phone.

**AC-CU:** cập nhật tên/địa chỉ đúng field; address null xóa thông tin liên hệ, bỏ field giữ nguyên; tên rỗng/null hoặc body{} hoặc sửa phone/center→400; ngoài scope404, QL403, thiếu token401; target đã ngừng404; PATCH/DELETE race theo409 ở Mục2; snapshot/ticket/history và created_at không đổi.

## 6. CD — DELETE /api/customers/{customer_id}

**Vai trò:** NV đúng active center, target customer có trong scope. Không query/body. **204 không body** cho lần đầu hoặc lặp theo Mục4; server gán deleted_at lần đầu bằng now. Thiếu/ngoài scope404; chưa xác thực401; QL403; input400/415; lỗi hệ thống500. 409 không dùng để chặn phiếu đang tham chiếu; hai DELETE đồng thời đúng scope đều204 và cùng timestamp đã lưu đầu tiên.

**AC-CD:** customer hoạt động→204, lưu deleted_at; lặp204 không ghi đè timestamp; có device/ticket mở vẫn ngừng được, mọi lịch sử giữ nguyên; phone còn UNIQUE; E04/E08 sau DELETE không tạo mới; E09–E13 theo ticket vẫn hoạt động; ngoài scope404 không thay đổi dữ liệu; no token401/QL403. DELETE thắng trước PATCH sau quan sát→409; nếu PATCH chưa quan sát trước DELETE→404; tạo ticket tranh khóa theo kiến trúc, không có phiếu mới sau khi delete đã commit và kiểm lại.

## 7. DU — PATCH /api/customers/{customer_id}/devices/{device_id}

**Vai trò:** NV, customer cùng active center; device thuộc customer, cả hai hoạt động. Body phải có đúng purchase_date (ngày hợp lệ không tương lai hoặc null); {}400. device_id/customer_id/product_id/serial_no/warranty_months/deleted_at và field lạ400. Không nhận months để ghi đè dữ liệu product đáng tin.

```json
{"purchase_date":"2026-09-01"}
```

**200:** schema Device E03/E04 với purchase_date mới:

```json
{"data":{"device_id":3311,"customer_id":1024,"product_id":101,"serial_no":"356938035643809","purchase_date":"2026-09-01","warranty_months":12}}
```

401/403/404/409/415/500 theo Mục2. Parent/device ngừng từ đầu→404; nested ownership sai→404. Không yêu cầu product hiện tại còn active để sửa ngày mua của device cũ; product ID phải vẫn giải nghĩa được trong config theo startup compatibility. Không sửa tháng bảo hành cũ khi config months thay đổi.

**AC-DU:** ngày hợp lệ/null→200; ngày tương lai/ngày không tồn tại/field chỉ đọc→400; parent hoặc device ngừng404; sai chủ/path404; scope404/QL403/no token401. Sau PATCH, E07 đánh giá dữ liệu device mới, ticket cũ vẫn dùng snapshot gốc; ticket chờ duyệt không tự thành không cần. Tạo ticket đồng thời lấy snapshot trước hoặc sau PATCH theo thứ tự khóa, không trộn hai giá trị.

## 8. DD — DELETE /api/customers/{customer_id}/devices/{device_id}

**Vai trò:** NV trong scope customer; device thuộc customer, cho phép cha đã ngừng. Không query/body. **204 rỗng**, lần đầu SET device.deleted_at, lặp giữ timestamp; serial vẫn UNIQUE, không cascade ticket. ID thiếu/ngoài scope/sai customer path404 DEVICE_NOT_FOUND (parent thiếu có thể404 CUSTOMER_NOT_FOUND theo bước kiểm); no token401, QL403, input400/415, lỗi500. Hai DELETE đúng scope204; không có409 chỉ vì có ticket mở.

**AC-DD:** ngừng được device đang có phiếu; lặp204 không đổi dữ liệu; serial trùng khi tạo E04 vẫn409, không đổi chủ; E08/E07 không dùng device ngừng; E10/E11/E12/E13 cho ticket hợp lệ vẫn giữ quyền gốc. Parent ngừng không xóa child tự động; có thể DELETE child đúng path/scope. PATCH/DELETE và E08 tranh khóa theo Mục4; không mất snapshot/history.

## 9. AC bổ sung cho E04/E05 và dữ liệu biên

Các AC này hoàn thiện DD07 được sinh viên duyệt, không chỉnh FR02/UC02 trong tệp SRS gốc.

| AC | Given/When | Then dự kiến | Truy vết |
| --- | --- | --- | --- |
| E04-01 | NV đúng scope, customer active, product config active, serial mới, ngày hợp lệ; POST E04 | 201; lưu đúng owner/product/serial/ngày và months từ config, không default12 | FR02/04, US02/04, UC02/04; QT-03/05; DD07 |
| E04-02 | product_id không tồn tại hoặc inactive | 404 PRODUCT_NOT_FOUND, không tạo device; không dùng default để lấp | DD07; E04 validation |
| E04-03 | serial đã có cùng customer, kể cả device ngừng | 409 SERIAL_ALREADY_EXISTS, không tạo/đổi device; existing_device chỉ nếu caller được đọc bản ghi hoạt động | QT-03, DD07, CRUD |
| E04-04 | serial thuộc customer khác | 409 DEVICE_OWNER_MISMATCH; không lộ chủ/hồ sơ khác, không chuyển chủ | QT-03/14 |
| E04-05 | purchase_date bỏ qua hoặc null | 201, lưu NULL; E07 chưa xác minh, E08 tạo MOI/chờ duyệt theo DD01 | FR04/06, QT-05 |
| E04-06 | Ngày mua tương lai/không tồn tại | 400 VALIDATION_FAILED với fields.purchase_date; không ghi | DD07, validation |
| E04-07 | Client gửi warranty_months/owner/role/actor | 400 field chỉ đọc/lạ; không dùng giá trị client | DD07, QT-03/14 |
| E04-08 | Cùng serial gửi hai request đồng thời | Một201, một409 theo owner; UNIQUE DB, không hai device | QT-03 |
| E04-09 | Product config months=-1/121/sai kiểu/trùng ID | Startup fail CONFIGURATION_ERROR; nếu phát hiện ở request không tạo và500 theo v0.1, không lộ config | DEP-RANGE/DEP-A |
| E04-10 | Product months=0 hoặc120 hợp lệ | 201, lưu chính xác0/120; months0 chỉ còn trong ngày mua; không nhận default | DD05/07, DEP-RANGE |
| E05-01 | Có product active/inactive, đọc danh sách | Trả active, sort product_id, phân trang/meta theo v0.1; không query bảng product | E05, DEP-A |
| TEXT-01 | issue_desc/content sau trim dài1/2000/2001 code point | Hai trường đầu hợp lệ,2001→400; DB CHECK tương ứng; emoji đếm1 | DD08 |
| TEXT-02 | Chuỗi toàn ký tự trim; NUL hoặc surrogate lẻ |400; không ghi; không áp min10 từ ví dụ | DD08/TECH Unicode |

## 10. Truy vết và giới hạn nghiệm thu

| Phần mở rộng | Căn cứ hiện có | Mức thay đổi |
| --- | --- | --- |
| Login A01 | BT2 Mục2.3 tr.4; NFR02; API Bearer dependency | Hạ tầng, không tạo FR/US nghiệp vụ hoặc bảng account/session |
| CU/CD | FR01/07, US01/07, UC01/11; QT-01/13/14/15; BT2 S1 | PATCH/soft delete là bổ sung được duyệt để đủ CRUD, không khẳng định đã có trong FR gốc |
| DU/DD | FR02/04, US02/04, UC02/04; QT-03/14; BT2 S1 | Bổ sung sửa ngày mua/ngừng sử dụng; soft delete device là quyết định thiết kế, không gán thêm nghĩa cho QT-13 |
| E04 AC | FR02/04 và DD07 | Bổ sung thiết kế/AC mà SRS/PDF gốc chưa có; cần đồng bộ hồ sơ trong tác vụ khác |
| Lịch sử E09–E13 | FR06/08, US06/08, UC07/06; QT-05/06/13–15 | Làm rõ policy cha ngừng; giữ ma trận quyền, snapshot và điều kiện duyệt gốc |

Nghiệp vụ đã được sinh viên duyệt; các chi tiết kỹ thuật nêu rõ TECH không được gọi là QT. Thiết kế đủ đầu vào cho các giai đoạn sau; BT2 S1/NFR02 chỉ được đánh giá đạt khi có implementation và test thực. Phase1 không chạy HTTP, crypto, migration, seed hay DB integration. Không tạo endpoint restore/purge, quản trị, refresh hoặc sửa chữa ngoài phạm vi.
