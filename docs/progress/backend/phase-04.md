# Phase 4 — Catalog, Warranty & Ticket Creation

**Ngày thực hiện:** 2026-10-24. **Kết luận:** HOÀN THÀNH trong phạm vi E05–E08.
**Repository:** D:\Đồ án\CĐTN1\cdtn1-BuiTheAnh-L2. Không dùng Git. Sinh viên đã cho phép Phase4, không cần chờ Postman.

## A. Mục tiêu và phạm vi

Hiện thực E05 GET /api/products, E06 GET /api/issue-categories, E07 GET /api/devices/{device_id}/warranty và E08 POST /api/tickets. Bảo toàn login, E01–E04 và bốn CRUD Customer/Device.

E09–E13 không được đăng ký; không thêm sửa vòng đời, phân công, sửa chữa, linh kiện, thu phí, thông báo hoặc quản trị catalog. Không Frontend/Docker/NFR tổng thể trong lượt này.

**Quyền hiện tại:** cwd là repository ổ D; chính repository có trong workspace roots/writable roots do môi trường cấp. Sandbox workspace-write, network restricted; các lệnh cần loopback được chạy với quyền lệnh có phạm vi qua auto-review. Không yêu cầu Full access, không thay ACL Windows hoặc quyền PostgreSQL. Khả năng đọc và phạm vi ghi sandbox được kiểm từ phiên hiện tại.

**SOURCE đã đối chiếu:** Case Study Mekong Mobile — Bảng3.1 tr.PDF5; phát biểu tr.6–7; biểu mẫu tr.8; quy trình/vòng đời tr.10–11; L2 tr.12; từ điển tr.15–16; Bảng9.1 tr.19 (QT-03/04/05/06/13/14/15); dữ liệu mẫu tr.22–23. BT1 BC T04.pdf bản31 trang — FR02–FR05 tr.10–13, ngoại lệ UC05 tr.23–24. BT2 — Mục2.1/2.2 tr.3, tích hợp/tái lập/khai báo AI tr.4–5. PDF nguồn ở Local Project đồng bộ, chỉ đọc.

**DESIGN:** kế hoạch sáu giai đoạn, SRS, API gốc và phụ lục, mapping/kiến trúc Phase1, schema và decision log đã chốt. DD01–09/DEP-A/DEP-RANGE/AUTH/CRUD giữ nguyên. Mã UC dùng theo API (UC07 phê duyệt, UC06 trao đổi); sai lệch PDF gốc đã được ghi từ Phase1, không sửa nguồn.

## B. Implementation

| API | Hành vi đã hiện thực | Thành phần |
| --- | --- | --- |
| E05 | NV đọc products active từ config đã validate/freeze, numeric sort, page1/size20 mặc định/max100, meta/empty/out-of-page đúng | intake.routes → catalog.service, không repository product |
| E06 | NV đọc issue_category active từ PG; map MAN_HINH/PIN/SAC/PHAN_MEM/NUOC_VAO/KHAC thành Màn hình/Pin/Sạc/Phần mềm/Nước vào/Khác; không query/body/default_priority | catalog.service → catalog.repository |
| E07 | Một query JOIN device/customer hoạt động trong active center; DATE assessment tùy chọn hoặc ngày Clock +07, dùng months đã lưu; kết quả đủ7 field, NULL đúng | warranty.service → deviceRepository.findInScope; assessWarranty thuần |
| E08 | Chỉ6 field request; khóa/recheck customer/device/category; server actor/time/code/MOI; warranty/SLA/snapshot; ticket+initial log cùng transaction;201 + Location sau commit | tickets.service → tickets.repository, repositories có sẵn; DTO riêng |

Mọi API yêu cầu Bearer+NV; quản lý403, thiếu/sai token401. Ngoài scope/soft delete404. Sai chủ device trong cùng scope409 DEVICE_OWNER_MISMATCH không kèm hồ sơ. Center yêu cầu khác active center403 ROLE_FORBIDDEN. Category không có/inactive400 VALIDATION_FAILED/fields.category_id; priority bắt buộc, không fallback default_priority.

Input ID JSON phải là số nguyên dương an toàn; category bind bigint khi tra cứu để ID hợp lệ lớn hơn INT4 vẫn nhận lỗi category400. issue_desc trim ECMAScript,1–2000 Unicode code point; cấm NUL/surrogate lẻ. Whitelist chặn toàn bộ actor/time/snapshot/status client. GET không body, query lạ/lặp400, JSON hỏng400, sai media415. Error envelope không raw SQL/stack/secret.

Config hỏng/thiếu products bị từ chối tại khởi tạo với CONFIGURATION_ERROR (public error mapping500), không phục vụ catalog một phần. Không tuyên bố đã nhận HTTP500 từ một process đang phục vụ với config hỏng: đây là preflight được unit/Foundation test kiểm. Config hợp lệ nhưng mọi product inactive trả200 rỗng. Category rỗng cũng200, không tự seed qua API đọc.

## C. Truy vết

Mã U/W/S thuộc tests/intake.unit.test.ts; I thuộc tests/intake.postgres.test.ts.

| Endpoint | FR / US / UC | SOURCE và DESIGN | Test |
| --- | --- | --- | --- |
| E05 | FR02/04, US02/04, UC02/04 (dependency) | DEP-A/DD07, phụ lục E05-01, QT-05 dữ liệu thời hạn | U01/02,I01/02 |
| E06 | FR03/US03/UC03 | CS Bảng3.1; API E06; không thay lựa chọn priority | U03,I01/03/09/17 |
| E07 | FR04/US04/UC04 | QT-05/14, soft delete theo phụ lục; DD04/05 | W*,U04/05,I04–06/10 |
| E08 | FR02–05/US02–05/UC02–05 | QT-03 owner; QT-04 SLA; QT-05 warranty; QT-06 log; QT-13 lịch sử; QT-14 scope; DD01/02/04/05/06/08/09 | U06/07,W*,S*,I07–21 |

QT-15: E05–E08 không trả phone hay nested customer; regression Phase3 tiếp tục kiểm phone masking ở E01/E02/error. Không tạo FR mới từ dependency catalog; không lấy quy tắc chặn hai phiếu mở từ ví dụ bài giảng.

## D. Quy tắc nghiệp vụ

assessWarranty nhận purchase_date nullable, months0–120 và assessed_on DATE; không Express/SQL/Date.now, không sửa input. Cộng trực tiếp year-month tới tháng đích rồi clamp đúng một lần:31/01+1=28/02;31/01+2=31/03;29/02/2024+12=28/02/2025. Ngày hết hạn inclusive;0 tháng chỉ còn trong ngày mua; ngày mua sau ngày đánh giá400. DATE chỉ nhận YYYY-MM-DD thực, không nhận TIMESTAMP.

| warranty_status | approval_status ban đầu | can_proceed | HTTP / status |
| --- | --- | --- | --- |
| CON_BAO_HANH | KHONG_CAN | true |201 / MOI |
| HET_BAO_HANH | KHONG_CAN | true |201 / MOI |
| CHUA_XAC_MINH | CHO_PHE_DUYET | false |201 / MOI |

Thiếu ngày mua giữ purchase_date_snapshot/expiry NULL, không giả lập. approved_by/approved_at/approval_note đềuNULL. initialApproval là lựa chọn domain/service; repository không quyết định nghiệp vụ. Hết hạn tiếp nhận được không có nghĩa miễn phí hoặc đã được phân công.

computeDueDate nhận timestamp+priority, trả Date mới. CAO24/TRUNG_BINH72/THAP120 giờ; đếm đủ24h thứ Hai–Bảy, bỏ Chủ nhật. Bắt đầu Chủ nhật nhảy thứ Hai00:00; kết thúc Chủ nhật00:00 cũng nhảy thứ Hai00:00. Không lịch lễ/ca làm việc. Ngày xác định qua IANA Asia/Ho_Chi_Minh, timestamp offset+07:00 theo kỳ hiện đại của prototype; không timezone Windows. Giữ millisecond khi cộng thời lượng; nhảy tới đầu thứ Hai có milliseconds000 đúng ranh giới.

Ví dụ test: thứ Hai28/09/2026 09:00 →29/09,01/10,03/10 09:00; thứ Bảy03/10 09:00 →05/10,07/10,09/10 09:00; Chủ nhật04/10 09:00 →06/10,08/10,10/10 00:00. Có vector qua tháng/năm và23:59:59.987.

## E. Transaction, mã phiếu và khóa

E08 dùng withTransaction Phase2, cùng PoolClient từ BEGIN tới COMMIT/ROLLBACK:

1. Kiểm role/active center và center request bằng principal/config tin cậy.
2. Khóa Customer FOR UPDATE theo scope; recheck active.
3. Xác định device trong scope, kiểm owner; khóa Device FOR UPDATE và đọc lại active/owner/date/months.
4. Khóa Category FOR SHARE, kiểm is_active. Khóa này chặn thay active cho tới transaction xong; các intake khác vẫn có thể cùng SHARE.
5. Lấy đúng một now sau các khóa. Ngày local của nó là assessed_on; tính warranty/SLA và snapshot từ device vừa đọc.
6. nextval ticket_code_seq; mã BH-<counter ít nhất6 chữ số>/<năm local>. Sequence từ1000000, MAX999999999999; tối đa20 ký tự, không reset năm, không COUNT+1/bảng cấp số.
7. INSERT ticket rồi INSERT đúng một log from_status=NULL/to_status=MOI/changed_by=principal.employee_id/changed_at=received_at.
8. COMMIT xong mới trả201 và Location. Log lỗi được chuyển INTERNAL_ERROR500 an toàn, giữ cause trong exception nội bộ, transaction rollback; không trả SQL detail.

UNIQUE code và partial UNIQUE initial log giữ hàng rào DB. Sequence không rollback, gap là hợp lệ và đã kiểm. Miền fixture BH-900001..900200/2026 tách runtime. Hai intake cùng device đều được phép, không phát minh quy tắc một phiếu mở.

DELETE thắng khóa → intake404, không insert; intake thắng → phiếu hợp lệ còn nguyên sau soft delete. PATCH date serialize cùng thứ tự khóa: snapshot lấy trọn trước hoặc sau PATCH. Test chờ pg_stat_activity.wait_event_type='Lock' với query marker, không đoán thứ tự bằng sleep. Category inactive được kiểm lại sau khi chờ khóa.

## F. File thực tế thay đổi

Đối chiếu SHA256 filesystem trước/sau, loại node_modules/dist/.git/cache khỏi kiểm mã nguồn. Không dùng Git. **14 file tạo,9 file sửa,0 file xóa.**

Tạo:

- src/backend/src/ticket.dto.ts
- src/backend/src/ticket.validation.ts
- src/backend/src/domain/business-time.ts
- src/backend/src/domain/sla.ts
- src/backend/src/domain/warranty.ts
- src/backend/src/repositories/catalog.repository.ts
- src/backend/src/repositories/tickets.repository.ts
- src/backend/src/routes/intake.routes.ts
- src/backend/src/services/catalog.service.ts
- src/backend/src/services/tickets.service.ts
- src/backend/src/services/warranty.service.ts
- src/backend/tests/intake.postgres.test.ts
- src/backend/tests/intake.unit.test.ts
- docs/progress/backend/phase-04.md

Sửa:

- src/backend/package.json
- src/backend/README.md
- src/backend/scripts/manual-phase3.ts
- src/backend/src/app.ts
- src/backend/src/customer-device.validation.ts
- src/backend/src/server.ts
- src/backend/src/repositories/devices.repository.ts
- src/backend/src/routes/customer-device.routes.ts
- docs/progress/backend/decision-log.md

Không thêm dependency hoặc đổi lockfile. Không thay docs/schema.sql, migration001/002, seed/reference config, API gốc/phụ lục, SRS, kế hoạch, sơ đồ/PDF/nguồn, Frontend, .env/credential hoặc ai-disclosure. Các file baseline ngoài danh sách sửa giữ nguyên SHA256.

## G. Kiểm thử thực tế

Tại src/backend, dùng npm.cmd trong PowerShell để gọi đúng npm executable; tương đương scripts README.

| Lệnh / nhóm | Trước sửa | Sau cùng | FAIL / SKIP sau |
| --- | --- | --- | --- |
| npm.cmd run typecheck | PASS | PASS |0 /0 |
| npm.cmd test |43 PASS |75 PASS |0 /0 |
| npm.cmd run test:db |34 subtest PASS (runner36 gồm2 cha) |56 subtest PASS (runner59 gồm3 cha) |0 /0 |
| npm.cmd run build | PASS | PASS |0 /0 |
| npm.cmd run db:check | PASS | PASS |0 /0 |

Sau cùng:22 Foundation unit +7 Foundation HTTP +14 Phase3 unit +32 Phase4 unit =75. PG:14 Foundation +20 Phase3 +22 Phase4 =56 tình huống con. Tổng131 tình huống thực; runner còn tính3 test cha, không dùng test cha để thổi số lượng case. Không cancel/todo/skip. Lint riêng NOT APPLICABLE vì dự án chưa cấu hình script lint.

Phase4 unit gồm7 nhóm U,11 vector W và14 vector S; test input/domain/config độc lập PG. Phase4 HTTP integration dùng Express thật và PG thật trong cùng22 tình huống, kiểm JSON/status/header lẫn persistence/constraints. Không lấy fake repository thay bằng chứng DB.

Trong quá trình viết test có lỗi annotation TS7022 ở biến Response; đã sửa annotation, không thay expected nghiệp vụ. Không có FAIL còn tồn tại trong lượt kiểm cuối.

Smoke bổ sung PASS:
- Bản build: login200, E01/E05/E06/E07 đọc200 trên public, E10 còn404; shutdown đóng server/pool. Không API ghi public.
- Helper manual Phase4: login/catalog/warranty200, E02/E04/E08 tạo201 trong schema riêng; một initial log, phiếu NULL purchase chờ duyệt; Location đúng; cleanup schema và shutdown PASS.
- Chưa chạy Postman GUI thay sinh viên; hướng dẫn manual đã chuẩn bị, không chờ sinh viên để hoàn thành Phase4.

## H. Bằng chứng database và bảo toàn public

PostgreSQL18.6, UTF8, đúng mekong-mobile-l2, account codex; preflight CONNECT/USAGE/CREATE schema và CREATE schema trong database đều true. Không tự GRANT/tạo database/reset public. Credential không in trong báo cáo.

Migrate/seed mọi test ghi chỉ ở schema ngẫu nhiên phase2_test_p4_... cùng cơ chế Phase2/3. Manual dùng phase2_test_manual_p4_...; cleanup chỉ khi CREATE thành công và tên khớp mẫu do chính lần chạy tạo. Không dọn schema không rõ chủ.

I07 xác minh ticket và log tồn tại sau201 cùng actor/time. I12 thêm CHECK lỗi có kiểm soát chỉ trên log của schema test, gây lỗi INSERT PostgreSQL thật:500, không ticket/log mới, không Location; bỏ constraint test rồi request tiếp thành công, sequence hở một số. I13 mười request cùng device tạo mười ID/code và đúng một log mỗi ticket. I19 kiểm PK/FK/CHECK/UNIQUE/code/log/due/snapshot/approval; giữ đúng6 bảng lõi+registry và5 FK. I14–17/21 kiểm tranh khóa và clock sau khóa; I11 hash ticket/log/SLA trước/sau PATCH+seed và hai snapshot riêng.

**Public trước/sau có cùng count và SHA256 toàn bộ nội dung hàng**, không chỉ so số hàng. Cách băm: SELECT to_jsonb(row)::text, sort toàn bộ chuỗi hàng, nối LF, SHA256 UTF8; không ghi raw hồ sơ vào báo cáo.

| Bảng public | Count trước = sau | SHA256 trước = sau |
| --- | --- | --- |
| customer |30 |420212db9bcc9b543fcfb33c486c17f47c6102163505cd23593b0a19e576bf44 |
| device |30 |d359873ef5f1be6ce8e234407e9622962d8cd47d10724a8f217f1fab9ca26e4d |
| issue_category |6 |ecaf59dce405d43c45f71ac5321256a2cd3927a1f0ddb5306a811835b4326cc8 |
| ticket |200 |4561fa726d4673b5e182487defb55ddb7ecd2989549cd10a94337cdcf3dfc4c4 |
| ticket_status_log |200 |c6adefd74c8fdab895c98d23384911c6f7a3bc038bd0dba4a3d0e59f10d3c3c6 |
| ticket_communication |30 |567c3bf8e1ca5a4c36afca64ae3ee9d9e183bc76f723b0272cc805892bf513a9 |
| schema_migration |2 |2e6c305f655a317225371b21b68bd6969d2ee46969e88fc9e7f966721148a0c7 |

public.ticket_code_seq giữ last_value=1000000/is_called=false. Registry vẫn hai migration; các test dùng sequence riêng theo search_path, không tiến số public.

## I. Kiến trúc và phạm vi vừa đủ

Giữ HTTP → Service/domain → Repository → PostgreSQL. Routes không SQL; domain không HTTP/SQL/đọc đồng hồ; repository chỉ truy cập dữ liệu. Tái sử dụng auth/principal/withTransaction, Customer/Device repository, body/query/pagination/Unicode validator và helper test. Chỉ bổ sung lookup device theo scope và export middleware JSON/GET dùng chung. localDate được đưa về helper domain và re-export để không phá caller Phase3.

Một router intake, ba service nhỏ Catalog/Warranty/Ticket, hai repository mới Category/Ticket; log ban đầu cùng ticket repository để giữ tối giản. Không ORM/class framework/i18n/table config/cron/DI/event bus. Production lắp đủ services; harness auth-only/Phase3 giữ giới hạn riêng để kiểm regression lịch sử, không phải production thiếu endpoint.

Helper manual có thêm tham số phase4 và script alias, không tạo framework mới. Không cần sửa schema hoặc thiết kế đã duyệt, nên không sửa thay-doi-thiet-ke.md.

## J. Tồn tại và giới hạn

Không còn blocker trong Phase4. Dữ liệu catalog là fixture/config được chấp thuận, không tuyên bố là CSV LMS thật. Config bất biến trong vòng đời process, thay config cần restart/quy trình đã ghi; SQL trực tiếp ngoài Backend vẫn có thể bỏ qua policy service.

E09–E13, phê duyệt/trao đổi và tích hợp Frontend chưa hiện thực trong lượt này. Location của E08 là định danh theo contract; GET theo Location còn404 tới Phase5. Không đánh giá đạt NFR01 UI, NFR02 phê duyệt, NFR03 fullstack/đóng gói hoặc toàn bộ BT2 từ kết quả này. Các phần đó ngoài phạm vi/NOT RUN, không phải blocker Phase4.

Chưa xác nhận sinh viên đã chạy Postman/đọc hiểu từng hàm; việc đồng bộ SRS/UC/ERD gốc vẫn là tác vụ tài liệu riêng đã ghi ở Phase1.

## K. Khai báo AI đề xuất

- Công cụ: OpenAI Codex.
- Mục đích: đọc/đối chiếu tài liệu, hỗ trợ hiện thực E05–E08/domain/transaction/DTO, viết và chạy test, hướng dẫn manual và báo cáo.
- File/phạm vi: đúng Mục F; không chỉnh docs/ai-disclosure.md.
- Kiểm chứng do Codex thực hiện: lệnh và kết quả thật tại G/H, đối chiếu contract, PG constraints/rollback/concurrency/snapshot/public hashes, smoke build/manual/cleanup.
- Sinh viên cần tự ghi những việc đã thực sự làm: đọc mã và nguồn, thử Postman, đối chiếu response/DB, giải thích DD05/06, scope/owner, snapshot và transaction. Không khai sinh viên đã làm khi chưa có bằng chứng.

## L. Checklist26 điều kiện nghiệm thu

| # | Điều kiện | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
|1 |E05 đúng contract |PASS |U01/02,I01/02 |
|2 |E06 đúng contract |PASS |U03,I01/03 |
|3 |E07 đúng contract |PASS |W*,U04/05,I04–06 |
|4 |E08 đúng contract |PASS |U06/07,I07–10/20 |
|5 |Catalog đúng nguồn PostgreSQL/config DEP-A |PASS |I02/03; không bảng product |
|6 |QT-04 SLA chính xác |PASS |S* (14 vector),I07/18 |
|7 |QT-05 warranty chính xác |PASS |W* (11 vector),U04,I04/10/20 |
|8 |QT-06 initial log đúng |PASS |I07/13/19/21 |
|9 |DD01/DD02 thiếu ngày mua/hết hạn |PASS |U07,I07/11 |
|10 |E07 không ghi dữ liệu |PASS |I05 (hash7 bảng và sequence) |
|11 |E08 tính lại warranty tại tiếp nhận |PASS |I10/11/21 |
|12 |Snapshot đúng và bảo toàn |PASS |I10/11/16/20 |
|13 |Ticket+log nguyên tử |PASS |I07/12/13 |
|14 |Rollback khi INSERT lỗi |PASS |I12 (CHECK PostgreSQL thật),Foundation rollback |
|15 |Mã duy nhất khi concurrent |PASS |I13 (10 request201),I18 (qua năm) |
|16 |QT-14/soft delete/ownership |PASS |I06/09/14–17/20 |
|17 |Validation/status/DTO/header |PASS |U06,I01/02/04/07–09 |
|18 |Unit test thực tế PASS |PASS |32 test Phase4 |
|19 |HTTP integration thực tế PASS |PASS |22 tình huống Express+PG Phase4 |
|20 |PostgreSQL integration thực tế PASS |PASS |22 Phase4 +34 regression |
|21 |Regression Phase2–3 PASS |PASS |43 unit/HTTP +34 PG subtest cũ |
|22 |Type-check/build PASS |PASS |Hai script chạy thành công |
|23 |Không sửa Frontend/Contract/migration cũ |PASS |Đối chiếu SHA256 tệp baseline |
|24 |Không phá public development |PASS |Count+hash7 bảng và sequence khớp |
|25 |README hỗ trợ manual |PASS |manual:phase4 smoke/cleanup PASS |
|26 |Báo cáo có truy vết/minh chứng/AI đề xuất |PASS |Mục C,G,H,K và báo cáo này |

PASS ở đây áp dụng cổng Phase4 được giao, không phải đánh giá giảng viên hay nghiệm thu toàn bộ học phần.

## M. Kết luận

**PHASE 4 — HOÀN THÀNH.** E05–E08 và26 tiêu chí có bằng chứng kiểm chứng; không blocker. Dừng sau Phase4 để sinh viên nghiệm thu và quyết định bước tiếp theo. Không dùng Git, không tự triển khai Phase5/6.

