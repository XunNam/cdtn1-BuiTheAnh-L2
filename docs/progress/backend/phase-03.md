# Phase 3 — Customer & Device APIs

**Ngày:** 2026-10-24, Asia/Saigon  
**Trạng thái:** HOÀN THÀNH — chờ sinh viên nghiệm thu  
**Phạm vi:** E01–E04 và bốn CRUD bổ sung đã được duyệt; không Git, không sửa Frontend/contract, không chuyển Phase4.

## A. Mục tiêu và phạm vi

Sinh viên đã nghiệm thu Phase2, xác nhận tự chạy các lệnh Foundation/build/DB và giao Phase3 trong yêu cầu “Triển khai Phase 3: Customer & Device APIs”. Sinh viên chưa kiểm Postman đầy đủ; vì vậy đã bổ sung hướng dẫn và server manual cách ly. Không tự suy kết quả automated thành sinh viên đã kiểm API.

Đã đọc/đối chiếu AGENTS/kế hoạch, báo cáo Phase1/2, Decision Log, schema, API gốc/phụ lục, SRS, mapping/kiến trúc, README và source/migration/seed/config/test Foundation. SHA-256 đầu lượt không có thay đổi so với kết quả Phase2. Có82 tệp trong inventory (bao gồm .env và hai private local, không gồm dependency/build/.git).

**SOURCE:** Case Study — L2 tr.PDF12; từ điển customer/device tr.15; Bảng9.1 tr.19 — QT-01/02/03/05/13/14/15. BT1 BC T04.pdf bản31 trang — FR01 tr.9, FR02 tr.10, FR07 tr.15–16. BT2 — Mục2.1/2.2 tr.3 yêu cầu hai thực thể đủ CRUD, ba lớp, quy tắc thật và test đúng/biên/sai. SRS dùng mã UC theo API hiện hành, không tự sửa hồ sơ gốc.

**DESIGN:** DD03/DD07/DEP-A/CRUD đã được duyệt; phạm vi một customer/một center, product/months từ config, whitelist PATCH, DELETE mềm và lịch sử theo phụ lục. **IMPLEMENTATION:** các kết quả dưới đây được kiểm trên Express/PostgreSQL thật. Không có business rule mới hoặc quyết định cần xin phê duyệt lại.

## B. Implementation từng endpoint

| Mã | Method/path sau /api | Hành vi đã hiện thực |
| --- | --- | --- |
| E01 | GET /customers?phone=... | Chuẩn hóa phone, SELECT đúng active center/active customer,200 Customer đã che; thiếu/sai400, thiếu/ngoài quyền/ngừng404 |
| E02 | POST /customers | Body full_name/phone/address, center/time server; INSERT PostgreSQL201. UNIQUE toàn cục quyết định race;409 PHONE_ALREADY_EXISTS, existing_customer chỉ active trong scope và đã mask |
| E03 | GET /customers/{customer_id}/devices | Parent active đúng scope; device active, filter serial exact/case-sensitive, sort ID số, page/size/total từ cùng snapshot; customer hợp lệ chưa có thiết bị200[] |
| E04 | POST /customers/{customer_id}/devices | Khóa parent active; kiểm product active, months từ config0–120; lưu explicit owner/product/serial/date/months.201; product thiếu/inactive404; ngày tương lai400; serial collision409 không chuyển owner |
| CU | PATCH /customers/{customer_id} | Chỉ full_name/address; bỏ field giữ nguyên, address=null xóa giá trị;200 Customer mask. Không sửa phone/center/time/ID |
| CD | DELETE /customers/{customer_id} |204 rỗng, chỉ customer.deleted_at; lặp204 giữ timestamp đầu, không cascade/giải phóng phone/chặn phiếu mở |
| DU | PATCH /customers/{customer_id}/devices/{device_id} | Chỉ purchase_date hợp lệ/null;200 Device, parent/device phải active và đúng owner/scope; không đổi product/months hoặc ticket snapshot |
| DD | DELETE /customers/{customer_id}/devices/{device_id} |204 rỗng, chỉ device.deleted_at; lặp204, serial UNIQUE giữ lại, không cascade. Cho phép parent đã ngừng khi đúng scope/quan hệ |

Tất cả tám endpoint chỉ NV được phép; không/sai/hết token401, manager403 trước parse/lookup. Mọi ID ngoài scope404. Body/query/field chỉ đọc sai400; media sai415; envelope an toàn. POST/PATCH JSON object theo contract; DELETE không body (JSON body400, nonJSON body415).

Không đăng ký E05–E13, global device search, transfer owner, restore/purge hoặc API quản trị. Login Phase2 giữ nguyên. E04 không tạo customer/ticket ngầm; issue_desc vẫn thuộc Phase4.

## C. Truy vết endpoint → FR/US/UC → QT → test

Mã U/I dưới đây là tên test P3-Uxx/P3-Ixx trong hai tệp test Phase3; I là Express+PostgreSQL thật.

| Endpoint | FR/US/UC | Quy tắc / căn cứ | Test chính |
| --- | --- | --- | --- |
| E01 | FR01/US01/UC01 | QT-01/02/14/15 | U01/06/07; I01/04 |
| E02 | FR07/US07/UC11 | QT-01/02/13/14/15 | U01/02/08; I02/03/13 |
| E03 | Phần Device của FR02/US02/UC02 | QT-03/13/14; API pagination | U06/07; I04/05/10/11 |
| E04 | FR02/US02/UC02, dependency FR04/US04/UC04 | QT-03/05/14, DD07 và AC E04-01..10 | U04/05/09/10; I05/06/07/14/15/18 |
| CU | Bổ sung liên quan FR01/07,US01/07,UC01/11 | BT2 CRUD, QT-13/14/15; phụ lục CU | U03/11/13; I08/16/17 |
| CD | Bổ sung liên quan FR01/07,US01/07,UC01/11 | BT2 CRUD, QT-01/13/14/15; phụ lục CD | U11; I11/15/16/19 |
| DU | Bổ sung liên quan FR02/04,US02/04,UC02/04 | BT2 CRUD, QT-03/05/13/14; phụ lục DU | U03/04/12/13; I09/16/19 |
| DD | Bổ sung liên quan FR02,US02,UC02 | BT2 CRUD, QT-03/13/14; phụ lục DD | U12; I10/11/19 |

Không coi PATCH/DELETE là FR gốc có sẵn: đó là mở rộng sinh viên đã duyệt để đủ CRUD. Phần issue_desc/ticket của FR02, assessment/SLA của FR04/05, approval/communication và NFR chưa được kết luận hoàn thành ở Phase3.

## D. File tạo/sửa/xóa

| Thao tác | Tệp | Lý do |
| --- | --- | --- |
| Sửa | docs/progress/backend/decision-log.md | Trạng thái Phase3 và TECH hiện thực/kiểm chứng |
| Sửa | src/backend/package.json | Lắp test Phase3 và script manual cách ly; không thêm dependency |
| Sửa | src/backend/README.md | Tình trạng hiện tại, hướng dẫn tám API và Postman cách ly |
| Sửa | src/backend/src/app.ts | Đăng ký router Customer/Device khi lắp services |
| Sửa | src/backend/src/errors.ts | Mã404/409, existing_* whitelist và malformed path400 |
| Sửa | src/backend/src/server.ts | Lắp services/repositories thực vào app, thông báo đúng Phase3 |
| Sửa | src/backend/tests/http.test.ts | Làm rõ harness Foundation auth-only; giữ các assertion regression |
| Tạo | src/backend/scripts/manual-phase3.ts | Server Postman schema riêng, tái dùng credential và cleanup |
| Tạo | src/backend/src/customer-device.dto.ts | Field response, phone masking, safe BIGINT và timestamp |
| Tạo | src/backend/src/customer-device.validation.ts | Phone/body/date/whitelist dùng chung |
| Tạo | src/backend/src/repositories/customers.repository.ts | SQL Customer scope/create/lock/patch/soft delete |
| Tạo | src/backend/src/repositories/devices.repository.ts | SQL Device owner/list/snapshot/create/lock/patch/soft delete |
| Tạo | src/backend/src/routes/customer-device.routes.ts | Tám HTTP endpoint, auth/role/input/media/envelope |
| Tạo | src/backend/src/services/customers.service.ts | Customer policies, collision privacy, transaction |
| Tạo | src/backend/src/services/devices.service.ts | Device owner/product/parent/soft delete/history policies |
| Tạo | src/backend/tests/customer-device.postgres.test.ts | 20 tình huống Express+PostgreSQL và concurrency thực |
| Tạo | src/backend/tests/customer-device.unit.test.ts | 14 unit test quy tắc, validator, DTO và service |
| Tạo | docs/progress/backend/phase-03.md | Báo cáo hiện tại A–M |

**Tổng:**7 tệp cũ sửa,11 tệp mới,0 xóa.75/82 tệp cũ giữ nguyên SHA-256. Không đổi dependency hoặc lockfile, migration cũ/schema/seed/config, .env/credential/.gitignore, SRS/ERD/diagram, API gốc/phụ lục, AGENTS/kế hoạch, báo cáo Phase1/2 hoặc Frontend. Tài liệu nguồn/PDF chỉ đọc.

Không cần migration mới hoặc cập nhật nhật ký thay đổi thiết kế: không phát sinh khác biệt schema/nghiệp vụ so với Phase1. Chi tiết TECH ghi ở [Decision Log, Mục8](decision-log.md), không sửa docs/ai-disclosure.md.

## E. Thiết kế, transaction và lựa chọn kỹ thuật

Routes chỉ HTTP/auth/input/response; services không req/res và điều phối scope/owner/product/collision/transaction; repositories SQL tham số hóa. Không ORM/DI hoặc in-memory store; các object repository được truyền vào để unit test, production dùng pg thực.

- Phone: trim hai đầu theo quy ước chung, loại dấu cách U+0020/dấu chấm giữa chuỗi, chuyển +84/84 thành0, kiểm10 chữ số; không đoán/sửa thuê bao, không tự bỏ dấu gạch hoặc tab giữa số. Dùng cùng normalizer khi tra/tạo.
- DTO: đúng field v0.1, không trả center_id/deleted_at của Customer. BIGINT qua string và safe integer; phone mask chung, timestamp offset+07:00. Ngày mua DATE lấy dạng ISO, ngày server theo Asia/Ho_Chi_Minh.
- E03: một câu SQL CTE cho parent/count/page, không COUNT và list ở hai snapshot khác nhau. Sort theo ID số trước phân trang, có test biên99/100; offset BigInt cho page hợp lệ lớn, trang rỗng vẫn giữ total.
- E02: INSERT một statement autocommit, UNIQUE phone là hàng rào cuối. E04: transaction khóa parent active rồi INSERT device. UNIQUE lỗi được rollback trước đọc collision; không UPSERT UPDATE hoặc khóa owner khác để xử lý duplicate.
- Mọi ghi liên quan cha/con khóa customer trước device. PATCH quan sát active trước transaction rồi lock/recheck: đã ngừng từ đầu404; mất active sau quan sát409 RESOURCE_CHANGED. Chỉ SET field được gửi; hai PATCH khác field không làm mất cập nhật nhau.
- DELETE khóa đúng scope, giữ timestamp đầu, không truy vấn/chặn ticket mở và không sửa bảng lịch sử. Device DELETE cho phép parent tombstone; PATCH đòi cả parent/device active. E04 sau DELETE thắng khóa không được tạo mới.
- Error Foundation mở rộng tối thiểu: các code contract404/409; whitelist existing_customer chỉ cho PHONE_ALREADY_EXISTS, existing_device chỉ cho SERIAL_ALREADY_EXISTS. URIError do path malformed trả400 thay vì500, không echo raw path/SQL.

Dùng lại withTransaction; không viết lại transaction manager. Không trigger, index/bảng hoặc FK config mới.

## F. Chứng minh CRUD Customer và Device

| Thực thể | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Customer | E02,201,I02/13 | E01,200,I01 | CU,200,I08/16/17 | CD,204,I11/15/16 |
| Device | E04,201,I05/06/14 | E03,200,I05 | DU,200,I09/16 | DD,204,I10/11 |

Hai thực thể đủ C/R/U/D trên Backend và PostgreSQL thật. Delete là soft delete theo thiết kế đã duyệt, không phải xóa vật lý. Đây là minh chứng phần CRUD Backend của BT2, không phải tuyên bố toàn bộ BT2 hoặc fullstack đạt.

## G. Security và dữ liệu lịch sử

Role gate ở HTTP trước validation và kiểm lại ở service; principal từ server. Customer scope customer.center_id=principal.active_center_id, SQL theo scope; Device qua parent/owner. Manager không có quyền của NV; header role/center tự khai không cấp quyền. Tám endpoint được kiểm401/403 và tài nguyên ngoài scope404.

Phone mask ở server cho mọi Customer/existing_customer. Collision ngoài scope hoặc tombstone không trả profile/ID/tên/phone nhận diện; serial khác owner không existing_device. Không Location chứa phone, không log raw input/PG detail/password/token/connection string.

Body whitelist chống sửa phone/center/owner/product/months/deleted_at/created_at; purchase_date tương lai/ngày không tồn tại bị chặn. E03 đọc months đã lưu, không lấy lại product config mới; device có product hiện tại inactive vẫn được sửa ngày mua theo contract.

Sau soft delete, E01/E03 và E04 qua parent ngừng bị chặn; FK và UNIQUE giữ nguyên. Snapshot/approval/status/SLA/log/communication không bị PATCH/DELETE chạm tới. Những endpoint ticket Phase4–5 chưa triển khai; chưa khẳng định đã chạy E11/E13, chỉ chứng minh quan hệ/lịch sử còn nguyên để chúng dùng sau này.

## H. Kiểm thử trước/sau và regression

Tất cả lệnh tại src/backend, dùng npm/Node hiện có. Không tạo lại .env/database/credential hoặc cài/nâng dependency.

| Thời điểm / lệnh | PASS/FAIL/SKIP | Kết quả |
| --- | --- | --- |
| Trước sửa: npm run typecheck | PASS | Strict type-check |
| Trước sửa: npm test |29/0/0|22 unit +7 HTTP Foundation |
| Trước sửa: npm run test:db |15/0/0|14 subtest +1 test cha Foundation |
| Trước sửa: npm run build / npm run db:check | PASS | Build và kết nối đúng DB18.6/UTF8/quyền |
| Sau sửa: npm run typecheck | PASS | Strict, không any/ts-ignore trong source mới |
| Sau sửa: npm test |43/0/0|22 unit Foundation +7 HTTP auth +14 unit Phase3 |
| Sau sửa: npm run test:db |36/0/0|14 PG Foundation +20 HTTP/PG Phase3 +2 test cha |
| Sau sửa: npm run build / npm run db:check | PASS | Build và DB preflight vẫn đạt |
| Smoke bản build với credential hiện có | PASS | Login200, E01/E03 đọc public200, shutdown; không ghi public |
| Smoke manual helper schema riêng | PASS | Login200, E02 create201, đóng server/pool và dọn schema manual |
| Static/hash/secret scan | PASS | Phạm vi file, không đổi public, không secret trong source/docs/example |

Runner tổng cộng79 PASS gồm2 test cha; **77 tình huống kiểm cụ thể theo nhóm**:36 unit,7 HTTP auth,20 HTTP+PostgreSQL Phase3 và14 PostgreSQL Foundation. Không tính test cha thành case nghiệp vụ mới, không test FAIL/SKIP/CANCEL ở lượt cuối.

P3-U01–U14 kiểm normalizer/invalid phone, body/readonly/null/omission/Unicode, date leap/future/local boundary, safe ID/DTO/masking, scope/product/owner/collision/soft delete, PATCH race và error mapping.

P3-I01–I20 chạy Express app thật nối PG: tám endpoint/response/error/role/scope; create/read/PATCH/DELETE; ID sort/pagination, product0/120/inactive, dateNULL, conflict privacy, unique race cùng/cross center/owner, soft-delete repeat và lịch sử. Các request DELETE→CREATE/PATCH được đồng bộ bằng row lock và kiểm pg_stat_activity của kết nối cùng user/database; không dựa vào sleep đoán thứ tự. FK/CHECK/rollback thật và seed không restore đều đạt.

Test Foundation cũ giữ assertions. Chỉ đổi tên/comment một test auth-only để không diễn đạt nhầm E01 chưa triển khai trong production; test full Phase3 và smoke bản build kiểm wiring thật.

**Giới hạn:** chưa chạy Postman GUI thay sinh viên; manual instructions và helper đã được smoke tự động. Chưa đo UI/NFR01, approval NFR02 hoặc fullstack/Docker NFR03; không chạy E05–E13. Những phần đó NOT RUN/ngoài Phase3, không blocker của phạm vi đã giao. Lint riêng NOT APPLICABLE vì không có cấu hình lint dự án.

## I. Bằng chứng database và không ảnh hưởng development

Dùng duy nhất mekong-mobile-l2, PostgreSQL18.6/UTF8; Node24.18.0/npm12.1.0 và dependency Phase2 giữ nguyên. Schema public trước/sau:

| Bảng | Trước | Sau | Hash toàn bộ hàng |
| --- | --- | --- | --- |
| customer |30|30| Khớp |
| device |30|30| Khớp |
| issue_category |6|6| Khớp |
| ticket |200|200| Khớp |
| ticket_status_log |200|200| Khớp |
| ticket_communication |30|30| Khớp |
| schema_migration |2|2| Khớp |

Hash SHA-256 được tính từ to_jsonb từng hàng đã sắp ổn định, bao gồm mọi cột, không in nội dung nhận diện ra log. Không chỉ so COUNT. public.ticket_code_seq vẫn last_value1000000,is_called=false. Không migrate/seed/cleanup public trong Phase3; migration/seed probes chỉ ở schema test.

HTTP/PG test tạo schema phase2_test_p3_<random> theo cơ chế Phase2 rồi chỉ dọn schema tự tạo. Manual helper dùng phase2_test_manual_p3_<random>, dùng lại private credential, không tạo account/session table. Test kiểm snapshot/hash ba bảng lịch sử trước/sau CRUD và SQL join ticket→device→customer, giữ đủ200 phiếu/200 log/30 trao đổi trong fixture. Tăng sequence riêng ở test để kiểm sort99/100, không public.

UNIQUE phone/serial kể cả tombstone, năm FK lõi và CHECK bảo hành giữ nguyên. E04 rollback/constraint lỗi không chiếm serial; một request create thắng trong race, owner không đổi. Seed chạy lại không restore parent/device đã ngừng hoặc sửa ticket snapshot. Sau kiểm cuối không để tiến trình test/smoke hoặc schema test của lượt này chạy còn lại.

## J. Vấn đề tồn tại và việc chưa làm

Không còn blocker bắt buộc Phase3. Không thay schema/contract để làm test PASS; không cần migration mới. Dữ liệu source/PDF/SRS/ERD/Frontend và tài khoản hiện có giữ nguyên.

Hai CRUD chỉ trong Backend. Phần tiếp nhận ticket/warranty/SLA, phê duyệt/trao đổi và NFR/fullstack vẫn thuộc các phase tiếp theo. Bản SRS/UC/ERD gốc còn việc đồng bộ đã ghi từ Phase1; không tự sửa trong lượt này.

DEP-A vẫn không FK tới config, SQL trực tiếp có thể bỏ qua kiểm service. Reference compatibility/ID ổn định tiếp tục theo baseline, không bổ sung metadata hoặc framework.

[README](../../../src/backend/README.md) có manual:phase3 để sinh viên thử Postman an toàn. POST/PATCH/DELETE ghi thật trong schema manual; dừng helper mất dữ liệu manual. npm run dev/npm start vẫn trỏ public theo cấu hình, nên không dùng chúng cho các ví dụ thử ghi khi muốn bảo toàn demo public.

## K. Nội dung đề xuất khai báo AI

- **Công cụ:** OpenAI Codex.
- **Mục đích:** đối chiếu nguồn/contract, hiện thực tám Customer/Device API, validator/serializer/error/transaction, viết test và hướng dẫn Postman/report.
- **Phạm vi:** các tệp tại Mục D, không API/SRS/Frontend/nguồn hoặc nghiệp vụ Phase4–5.
- **Codex đã kiểm:** regression trước/sau, Express+PG thật, constraint/concurrency/rollback, snapshot/history/seed, hash public/file, manual-helper và compiled smoke như H/I.
- **Sinh viên cần tự kiểm:** đọc service/repository/contract, chạy README/test, tự thực hiện chuỗi Postman cùng role/scope/soft delete và giải thích quyết định. Chỉ ghi những việc thật sự đã làm; xác nhận tự kiểm Phase2 không đồng nghĩa đã kiểm Phase3.

Không sửa docs/ai-disclosure.md hoặc khai thay sinh viên đã thử các API mới.

## L. Checklist20 tiêu chí nghiệm thu

| STT | Tiêu chí | Kết quả / bằng chứng |
| --- | --- | --- |
|1| E01–E04 đúng contract | PASS — I01–07,13–15 và smoke bản build |
|2| Bốn CRUD đúng phụ lục | PASS — I08–12,16–19 |
|3| Customer đủ C/R/U/D | PASS — E02/E01/CU/CD thực thi PG |
|4| Device đủ C/R/U/D | PASS — E04/E03/DU/DD thực thi PG |
|5| PostgreSQL là dữ liệu thực | PASS — repositories pg, test HTTP→DB |
|6| QT-01/02/03 kiểm chứng | PASS — U01/08/10,I01/03/07/13/14 |
|7| QT-13/history/soft delete | PASS — I08–11/19, hash lịch sử và FK |
|8| QT-14 center scope | PASS — I01/03/04/07, SQL scope |
|9| QT-15 success/error masking | PASS — U06/08,I01/02/03 |
|10| Không chuyển owner khi serial trùng | PASS — I07/14 |
|11| Field chỉ đọc không sửa được | PASS — U03/05,I02/06/08/09 |
|12| Snapshot cũ không đổi sau PATCH | PASS — I09 và hash ticket/log/communication |
|13| UNIQUE/FK/transaction/concurrency PG thật | PASS — I13–18, regression PG |
|14| Status/error/response đúng contract | PASS — I01–12/15/16, U14 |
|15| Phase2 regression tiếp tục PASS | PASS — giữ29 Foundation unit/HTTP +14 PG subtest |
|16| Type-check/build | PASS — lệnh trước/sau đều exit0 |
|17| Không sửa Frontend/contract | PASS — SHA-256 tệp ngoài phạm vi |
|18| Không phá dữ liệu development | PASS — hash toàn bộ hàng7 bảng public khớp, counts/sequence giữ nguyên |
|19| README manual Postman/curl | PASS — bảng request Postman8 endpoint, role/scope/delete, helper cách ly đã smoke |
|20| Báo cáo truy vết/bằng chứng/AI | PASS — Mục C/H/I/K và Decision Log |

## M. Kết luận

**PHASE 3 — HOÀN THÀNH**, đủ bằng chứng20/20 tiêu chí trong phạm vi Customer/Device Backend được giao. Không đồng nghĩa toàn bộ FR02/FR04, BT2 hoặc các NFR đã đạt; không khẳng định sinh viên đã manual test Postman.

Dừng sau Phase3, chờ sinh viên nghiệm thu. Không tự triển khai E05–E13, Phase4 hoặc dùng Git.
