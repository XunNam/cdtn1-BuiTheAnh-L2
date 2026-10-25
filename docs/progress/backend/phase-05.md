# Phase 5 — Warranty Approval & Communications

**Ngày:** 2026-10-24. **Kết luận:** HOÀN THÀNH trong phạm vi E09–E13.
**Repository:** D:\Đồ án\CĐTN1\cdtn1-BuiTheAnh-L2.
Không dùng Git, không tự chuyển Phase6; sinh viên đã nghiệm thu Phase4 và giao rõ Phase5.

## A. Mục tiêu và phạm vi

Hiện thực đúng năm endpoint: E09 GET /api/tickets; E10 GET /api/tickets/{ticket_id}; E11 POST /api/tickets/{ticket_id}/warranty-approval; E12 GET và E13 POST /api/tickets/{ticket_id}/communications. Giữ E01–E08, login và bốn CRUD Customer/Device.

Không có thêm API/bảng nghiệp vụ; không phân công, sửa chữa, linh kiện, thu phí, thông báo ngoài hệ thống, quản trị, chuyển vòng đời, xóa/sửa/khôi phục communication hoặc ticket.

**Nguồn đã đọc lại:** AGENTS, kế hoạch, báo cáo Phase1–4/decision log, schema, API v0.1/phụ lục, SRS, mapping/kiến trúc Phase1 và README; đối chiếu source/migration/seed/reference config/test hiện hành, chạy lại regression trước sửa. Current working directory là repository, có trong writable roots workspace-write của phiên hiện tại. Network restricted; lệnh cần loopback được chạy qua quyền lệnh có phạm vi, không thay ACL/GRANT hoặc yêu cầu Full access.

**SOURCE:** Case Study Mekong Mobile — phát biểu chị Lan tr.PDF6 (lịch sử có nội dung/thời điểm/người ghi); quy trình/vòng đời tr.10–11; L2 tr.12; từ điển tr.15–16; Bảng9.1 tr.19 — QT-05/06/13/14/15. BT1 BC T04.pdf bản31 trang — FR06 tr.14; FR08 tr.16–17; NFR02 tr.18; ngoại lệ tạo/chờ duyệt tr.23–24. Nguồn PDF ở Local Project đồng bộ, chỉ đọc.

**DESIGN:** DD01–09/DEP-A/AUTH/CRUD và8 FR/US giữ baseline đã được sinh viên duyệt. API gốc/phụ lục quy định đầy đủ request/status/role/history; mã UC theo API: phê duyệt UC07, trao đổi UC06. Sai lệch mã UC/actor trong PDF gốc đã ghi từ Phase1, không sửa hồ sơ nguồn.

## B. Implementation

| API | Hành vi đã kiểm | Module |
| --- | --- | --- |
| E09 | QL only; allowed centers, ticket active, warranty_status=CHUA_XAC_MINH; approval_status mặc định CHO_PHE_DUYET hoặc DA_PHE_DUYET. Sort received_at/ticket_id tăng, page1/size20/max100, total sau lọc quyền | tickets.routes → tickets.service → ticketRepository.list |
| E10 | NV active center/QL allowed centers; JOIN ticket→device→customer kể cả parent tombstone; đủ DTO API, maskPhone chung, snapshot/SLA lưu sẵn, không tính lại/ghi | ticketRepository.detail → ticketDetailDto |
| E11 | QL đúng scope, khóa ticket, kiểm CHUA+CHO+MOI; guard UPDATE bốn metadata; actor/time server, note optional/null/trim1–1000; commit rồi200 | tickets.service.approve → ticketRepository.lock/approve |
| E12 | NV/QL đọc đúng ticket/scope, ASC created_at/communication_id, total cùng snapshot; ticket hợp lệ chưa có trao đổi200[], thiếu/ngoài scope/ngừng404 | communicationRepository.list → communicationDto |
| E13 | Chỉ NV đúng center, content bắt buộc trim1–2000 Unicode, lock ticket rồi INSERT; actor/time server;201 đúng5 field, không Location dư thừa | tickets.service.communicate → communicationRepository.insert |

E09 trả đúng11 field theo ví dụ contract (gồm customer_id suy ra qua device và can_proceed); E10 gồm21 field của E08 và hai object customer/device nested (23 field cấp ngoài); E11 đúng8 field, E12/E13 mỗi communication5 field. Không actor dư thừa/phone trong danh sách; E10 NV che phone, QL xem đầy đủ chỉ trong scope. approved_by/created_by/ID chuyển số an toàn, approved_at nullable/+07:00; DATE snapshot giữ nguyên YYYY-MM-DD.

Mọi route kiểm Bearer/role trước parse. Query lạ/lặp, safe-ID/kiểu/readonly/body sai400; media sai415; token401; role403; thiếu/ngoài scope/ticket ngừng404 TICKET_NOT_FOUND. Lặp duyệt409 ALREADY_APPROVED; không thuộc diện409 APPROVAL_NOT_APPLICABLE. SQL lỗi ghi được chuyển500 an toàn và giữ cause nội bộ, không lộ SQL/stack/secret.

## C. Truy vết

U=P5-U trong tests/ticket-history.unit.test.ts; I=P5-I trong tests/ticket-history.postgres.test.ts; N=NFR02 thuộc I12.

| Endpoint | FR / US / UC | SOURCE / DESIGN | Test ID |
| --- | --- | --- | --- |
| E09 | FR06/US06/UC07 | QT-05/14; API E09, danh sách ngoại lệ CHUA_XAC_MINH, phụ lục history | U01/04/07/09,I01–03/16/21 |
| E10 | FR06/08,US06/08,UC07/06 | QT-13/14/15; API E10, snapshot DD04/05/09; không tính lại SLA | U06/10,I04–06/16/20 |
| E11 | FR06/US06/UC07,NFR02 | QT-05/14; DD01/09, API E11; QT-06 không log chuyển trạng thái giả | U02/05/11/12,I07–12/16/19/20,N01–09 |
| E12 | FR08/US08/UC06 | CS phát biểu chị Lan; QT-13/14, API E12/sort/pagination | U08/13,I13/16/17/20 |
| E13 | FR08/US08/UC06 | CS phát biểu chị Lan; QT-13/14; DD08/09, API E13 | U03/14/15,I14–20 |

Đây là nghiệp vụ trực tiếp L2 của FR06/08. Foundation/auth/config và E01–E08 là dependency đã hiện thực; không phát sinh FR/US mới từ query, session, danh mục hoặc khả năng đọc lịch sử.

## D. Phê duyệt bảo hành

Service kiểm QL trước truy cập repository; centers từ principal server. withTransaction dùng cùng một PoolClient:

1. BEGIN; SELECT ticket theo ID/allowed centers/deleted_at IS NULL FOR UPDATE.
2. Sau khóa, nếu đã DA_PHE_DUYET →409 ALREADY_APPROVED. Nếu không CHUA_XAC_MINH+CHO_PHE_DUYET+MOI →409 APPROVAL_NOT_APPLICABLE.
3. Lấy approved_at từ Clock sau khóa; principal.employee_id → approved_by, note đã validate → approval_note.
4. UPDATE chỉ approval_status/approved_by/approved_at/approval_note, có guard lặp lại scope/active/warranty/approval/status, kiểm row trả về.
5. COMMIT trước response200. Guard không cập nhật hàng nào trả conflict, không ghi đè metadata. UPDATE/CHECK lỗi rollback và trả500 an toàn.

Giữ toàn bộ field khác: status, warranty_status, assessed_on, các snapshot, received_at/due_date/received_by, device/category/priority, issue_desc và center. can_proceed suy từ KHONG_CAN hoặc DA_PHE_DUYET; không cột boolean mới. Duyệt không biến CHUA thành CON_BAO_HANH, không tính phí/miễn phí, không tạo ticket_status_log.

I10 dùng connection chặn thật giữ ticket lock, cho QL21 chờ trước, QL22 chờ sau; quan sát pg_stat_activity wait_event_type=Lock rồi nhả. Kết quả một200/một409, actor21/time/note đầu được giữ; retry sau đó vẫn409 và hash dữ liệu không đổi. Không dựa vào sleep hoặc chỉ mock concurrency.

I11 thêm CHECK gây lỗi có kiểm soát trong chính schema test (không sửa migration), kiểm PG UPDATE thực sự rollback toàn bộ; sau bỏ constraint test, request hợp lệ thành công. Gọi guarded repository UPDATE lần hai trả0 hàng và không overwrite, kể cả không gọi lại bước lock ở test probe.

## E. Lịch sử trao đổi

E12 NV/QL đọc; E13 chỉ NV ghi. Phạm vi theo ticket.center_id, không điều kiện active của customer/device. Ticket ngừng/ngoài scope/thiếu404, không nhầm với lịch sử rỗng200[].

E12 dùng một SQL CTE gồm visible_ticket/visible/paged/count; data/total và quyền cùng statement snapshot. Sort ID số khi timestamp bằng nhau (test99/100). Offset BigInt tránh tràn khi page là safe integer lớn. Không JOIN actor hoặc trả profile cá nhân ngoài DTO.

E13 khóa ticket hợp lệ trong withTransaction rồi INSERT communication, thời điểm từ Clock, actor từ principal. Ticket còn CHO_PHE_DUYET vẫn nhận trao đổi để xác minh. Chỉ thêm communication; không cập nhật ticket, lịch sử trạng thái, SLA, snapshot hoặc approval. Không gửi tin ra ngoài, không API sửa/xóa nội dung.

I14 xác minh Unicode1/2000 code point bằng char_length PG và DTO; I15 chặn rỗng/toàn trắng/2001/NUL/surrogate/readonly/role/scope. I17 mười request concurrent tạo mười message duy nhất, không mất/ghi đè; đọc đồng thời vẫn data.length=total ở trang đủ chứa. I18 gây CHECK lỗi INSERT thật, rollback và trả500, không báo201 giả.

## F. Phân quyền và NFR02

| Actor | E09 | E10 | E11 | E12 | E13 |
| --- | --- | --- | --- | --- | --- |
| NV |403 | Active center |403 | Active center | Active center |
| QL | Allowed centers | Allowed centers | Allowed centers + điều kiện duyệt | Allowed centers |403 |
| Không token/token sai/hết hạn/inactive |401 |401 |401 |401 |401 |

QL21 chỉ center1; QL22 center1/2. NV không mở rộng quyền chỉ vì có membership khác: active center vẫn là giới hạn ghi/đọc của NV. Ngoài scope404 để không lộ tồn tại, role gate trước resource lookup; không lấy role/allowed centers/actor từ body/header.

**Nhóm NFR02 riêng I12, kết quả lượt regression cuối:**9/9 yêu cầu trái quyền bị từ chối đúng expected,9/9 không đổi dữ liệu. Tỷ lệ trái quyền thành công **0/9=0%**, tỷ lệ từ chối đúng **9/9=100% trong bộ đã chạy**.

DB state mỗi lượt được băm từ count+SHA256 toàn bộ hàng7 bảng của schema test. Trong bảng sau H là trạng thái thực ghi ở stdout P5_NFR_EVIDENCE:
H=15d46a055b7fc0361a8f306c07ee3f5ecd2075ae237173f4502280b2481581d0.

| ID | Actor / điều kiện xác thực | Center actor | Ticket / điều kiện đầu | HTTP dự kiến | HTTP thực tế | DB trước | DB sau | Kết quả |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|N01 |Chưa đăng nhập |— |Center1 / CHUA+CHO+MOI |401 |401 |H |H |PASS |
|N02 |Token không hợp lệ |— |Center1 / CHUA+CHO+MOI |401 |401 |H |H |PASS |
|N03 |NV11 |1 |Center1 / CHUA+CHO+MOI |403 |403 |H |H |PASS |
|N04 |QL21 ngoài scope |1 |Center2 / CHUA+CHO+MOI |404 |404 |H |H |PASS |
|N05 |NV11 giả role/actor/center bằng header |1 |Center1 / CHUA+CHO+MOI |403 |403 |H |H |PASS |
|N06 |NV11 giả role/approved_by trong body |1 |Center1 / CHUA+CHO+MOI |403 |403 |H |H |PASS |
|N07 |QL21 token hết hạn đúng biên |1 |Center1 / CHUA+CHO+MOI |401 |401 |H |H |PASS |
|N08 |QL21 session có sẵn, account bị vô hiệu hóa trong adapter test |1 |Center1 / CHUA+CHO+MOI |401 |401 |H |H |PASS |
|N09 |inactive_demo login401, không có session hợp lệ |1 |Center1 / CHUA+CHO+MOI |401 |401 |H |H |PASS |

N07 dùng Auth thật với fixed clock để kiểm hết hạn đúng biên, không sleep. N08 dùng adapter accounts mutable chỉ trong test để mô phỏng vô hiệu hóa sau login; không sửa config/credential thực, production config vẫn frozen và thay cấu hình theo quy trình restart. N09 xác nhận inactive_demo login401 không cấp session rồi E11 không có token hợp lệ401. Các ca body sai/không đủ điều kiện nghiệp vụ riêng ở I08/09 không được cộng thành lượt trái quyền để tăng tỷ lệ.

Bằng chứng hữu hạn này phục vụ NFR02 Backend, không chứng minh an ninh tuyệt đối mọi tình huống hoặc hệ thống production.

## G. File thực tế thay đổi

Đối chiếu SHA256 filesystem với baseline trước sửa, không Git; loại dependency/generated build/cache/.git khỏi kiểm source. **5 file tạo,11 file sửa,0 file xóa.**

| Loại | File | Lý do |
| --- | --- | --- |
|Tạo |src/backend/src/repositories/communications.repository.ts |Query CTE lịch sử và INSERT communication tham số hóa. |
|Tạo |src/backend/src/routes/tickets.routes.ts |Đúng năm route HTTP E09–E13 với role khác nhau. |
|Tạo |src/backend/tests/ticket-history.postgres.test.ts |22 tình huống HTTP+PG, concurrency/rollback/NFR02/liên thông. |
|Tạo |src/backend/tests/ticket-history.unit.test.ts |15 unit validator/domain policy/serializer/service. |
|Tạo |docs/progress/backend/phase-05.md |Báo cáo này với32 tiêu chí và bằng chứng. |
|Sửa |src/backend/package.json |Thêm hai file test vào scripts và manual:phase5; không đổi dependency. |
|Sửa |src/backend/README.md |Cập nhật hiện trạng, kết quả test và walkthrough Postman/schema cách ly. |
|Sửa |src/backend/scripts/manual-phase3.ts |Mở rộng helper hiện có cho phase5/cổng3004, giữ cleanup theo schema tự tạo. |
|Sửa |src/backend/src/app.ts |Lắp router E09–E13 qua tùy chọn services, giữ harness cũ. |
|Sửa |src/backend/src/errors.ts |Ánh xạ TICKET_NOT_FOUND404 và hai conflict approval409. |
|Sửa |src/backend/src/server.ts |Production lắp đầy đủ E01–E13, dùng chung TicketService. |
|Sửa |src/backend/src/ticket.dto.ts |Serializer E09/E10/E11/E12/E13, metadata nullable và can_proceed sau duyệt. |
|Sửa |src/backend/src/ticket.validation.ts |Approval filter, note và content bằng validator chung. |
|Sửa |src/backend/src/repositories/tickets.repository.ts |Query list/detail/lock/guarded approval, mở rộng kiểu row theo trạng thái lưu sẵn. |
|Sửa |src/backend/src/services/tickets.service.ts |Scope, điều kiện duyệt, transaction và history/communication; giữ intake cũ. |
|Sửa |docs/progress/backend/decision-log.md |Ghi TECH trong phạm vi Phase5, không chốt nghiệp vụ mới. |

Không sửa test cũ hoặc expected để lấy PASS. Không thêm dependency/đổi lockfile/framework. Không sửa API gốc/phụ lục, SRS, schema, migration001/002, seed/reference config, Frontend, kế hoạch, sơ đồ/PDF/nguồn, .env/private credential hoặc ai-disclosure. Không cần thay đổi thiết kế, nên không sửa thay-doi-thiet-ke.md. dist được sinh lại bởi build, không phải source baseline.

## H. Kiểm thử thực tế

Môi trường: Node24.18.0, npm12.1.0, PostgreSQL18.6 UTF8, database mekong-mobile-l2. cwd src/backend khi gọi các script; npm.cmd dùng trong PowerShell tương đương scripts README.

| Lệnh | Baseline trước sửa | Sau Phase5 | FAIL / SKIP sau |
| --- | --- | --- | --- |
| npm.cmd run typecheck |PASS |PASS |0 /0 |
| npm.cmd test |75 PASS |90 PASS |0 /0 |
| npm.cmd run test:db |56 subtest PASS (runner59 gồm3 cha) |78 subtest PASS (runner82 gồm4 cha) |0 /0 |
| npm.cmd run build |PASS |PASS |0 /0 |
| npm.cmd run db:check |PASS |PASS |0 /0 |

90 test unit/HTTP =22 unit Foundation+7 HTTP Foundation+14 unit Phase3+32 unit Phase4+15 unit Phase5.
78 PG subtest =14 Foundation+20 Phase3+22 Phase4+22 Phase5; các nhóm HTTP+PG chạy Express thật với PG thật, không dùng fake thay bằng chứng DB. Tổng168 tình huống thực; runner172 khi cộng4 test cha, không dùng test cha để thổi số case.

Không fail/skip/cancel/todo ở lượt cuối; test cũ vẫn giữ nguyên. Lint riêng NOT APPLICABLE vì không script/config lint. Các test mới được chạy riêng rồi regression đầy đủ; không có FAIL còn tồn tại.

**Liên thông I20 PASS:** login NV → E05/E06 → E02/E04 → E01/E03 → E07 chưa xác minh → E08/Location → E10 chưa duyệt → E13/E12 xác minh → login QL → E09 chờ → E11 → E10 đã duyệt → E09 đã duyệt → retry409. Status vẫn MOI, warranty vẫn CHUA, snapshot/SLA/log giữ nguyên. Nhánh CON/HET không thuộc diện duyệt được kiểm I08.

**Smoke bổ sung PASS:**
- Bản build production: login NV/QL, E09/10/12 đọc200, phone masking đúng, NV E09 bị403; không ghi public.
- manual:phase5: schema riêng, E08 tạo201, E09/10/12 đọc200, E13 tạo201, E11 duyệt200, duyệt lại409; snapshot/SLA và duy nhất một status log không đổi.
- Shutdown HTTP/session/pool và xác nhận schema manual đã được dọn PASS.
- Chưa chạy Postman GUI thay sinh viên; không chờ Postman để hoàn thành kiểm tự động được giao.

## I. Bằng chứng PostgreSQL và bảo toàn development

Preflight account codex: CONNECT/USAGE/CREATE đối tượng schema và CREATE schema trong đúng database đều true. Không đổi PostgreSQL role/GRANT, không tạo/drop/reset database hoặc public. .env/credential có sẵn được dùng nguyên trạng.

Mọi test ghi ở schema phase2_test_p5_<random> (và các schema test riêng của regression); manual phase2_test_manual_p5_<random>. Cleanup chỉ schema do lần chạy CREATE thành công, tên khớp mẫu; không xóa schema không rõ chủ. Identity ticket999/1000 và communication99/100 được tăng có chủ đích chỉ trong schema test để bắt sort dạng chuỗi; sequence public giữ nguyên.

I07/10/11 xác minh transaction/guard/rollback/dữ liệu commit; I12 hash trước/sau từng request trái quyền; I16 giữ lịch sử khi cả cha/con tombstone; I19 thay deleted_at trong fixture transaction để chứng minh E11/E13 kiểm lại sau lock và trả404, không phát sinh metadata/message. Không tạo API xóa ticket ngoài phạm vi.

I22 chạy seed lại giữ nguyên toàn bộ hàng, approval/communication/snapshot; PG vẫn đúng6 bảng lõi và1 schema_migration. Constraints/index/FK/migration giữ nguyên, các regression integrity Phase2–4 tiếp tục PASS.

**Public trước/sau cùng count và hash toàn bộ hàng**, không chỉ so count. Phép băm: SELECT to_jsonb(row)::text, sort chuỗi hàng, nối LF rồi SHA256 UTF8; không in dữ liệu hồ sơ gốc.

| Bảng public | Count trước=sau | SHA256 trước=sau |
| --- | --- | --- |
|customer |30 |420212db9bcc9b543fcfb33c486c17f47c6102163505cd23593b0a19e576bf44 |
|device |30 |d359873ef5f1be6ce8e234407e9622962d8cd47d10724a8f217f1fab9ca26e4d |
|issue_category |6 |ecaf59dce405d43c45f71ac5321256a2cd3927a1f0ddb5306a811835b4326cc8 |
|ticket |200 |4561fa726d4673b5e182487defb55ddb7ecd2989549cd10a94337cdcf3dfc4c4 |
|ticket_status_log |200 |c6adefd74c8fdab895c98d23384911c6f7a3bc038bd0dba4a3d0e59f10d3c3c6 |
|ticket_communication |30 |567c3bf8e1ca5a4c36afca64ae3ee9d9e183bc76f723b0272cc805892bf513a9 |
|schema_migration |2 |2e6c305f655a317225371b21b68bd6969d2ee46969e88fc9e7f966721148a0c7 |

public.ticket_code_seq vẫn last_value=1000000/is_called=false. Registry vẫn2 migration. Public30 customer/30 device/6 category/200 ticket/200 log/30 communication không thay đổi sau regression và smoke.

## J. Kiến trúc và tái sử dụng

Giữ Routes → Services → Repositories → PG. Router chỉ role/input/HTTP; service quyết định scope/điều kiện duyệt, điều phối Clock/transaction; repository SQL tham số hóa và guarded UPDATE. Domain warranty/SLA giữ nguyên, không gọi khi xem/duyệt/trao đổi.

Mở rộng TicketService và ticket repository hiện có; một communication repository mới có trách nhiệm list/insert rõ ràng. Dùng lại auth/principal/withTransaction/validator/phone mask/timestamp/helper tests, không authentication thứ hai, ORM/DI/CQRS/cache/message bus/bảng phụ trợ.

createApp nhận service history tùy chọn để harness từng phase giữ phạm vi cũ. Production và manual phase5 lắp đủ E01–E13; các harness Phase3/4 không lắp tương lai là thiết kế regression, không phải production thiếu API. TicketService dùng chung cho intake và history. Manual helper chỉ thêm phase5, không framework mới.

## K. Rủi ro và giới hạn

Không còn blocker trong phạm vi Phase5. Dữ liệu DEP-A là fixture/config mô phỏng, không tuyên bố từ CSV thật. Không hot reload config; thay quyền/account theo quy trình restart. Lịch sử actor giữ ID, không đòi actor lịch sử còn active.

SQL ngoài Backend có thể bỏ qua policy application; tests fault injection chỉ trong schema cách ly, không mở API hay nới constraints production. Không endpoint sửa/xóa communication, reset phê duyệt, thay đổi vòng đời hoặc chuyển owner.

NFR01/UI, NFR03/fullstack/Docker, đo hiệu năng giao diện/đóng gói và nghiệm thu toàn bộ BT2 chưa được kiểm trong Phase5: NOT RUN/ngoài phạm vi, không tự chuyển Phase6. NFR02 chỉ được báo trên9 lượt trái quyền thực tế đã chạy, không bảo đảm tuyệt đối. Sinh viên chưa xác nhận Postman; đồng bộ SRS/UC/ERD gốc vẫn là tác vụ tài liệu riêng.

## L. Khai báo AI đề xuất

- Công cụ: OpenAI Codex.
- Mục đích: đọc/đối chiếu API và nguồn, hỗ trợ hiện thực E09–E13/transaction/query/DTO/validation, viết/chạy test, README và báo cáo.
- Phạm vi file: đúng Mục G; không sửa docs/ai-disclosure.md.
- Codex đã kiểm: các lệnh thực tế Mục H, HTTP/PG/concurrency/rollback/NFR02/liên thông, smoke build/manual/shutdown, hash public và hash file bảo vệ.
- Sinh viên cần tự ghi việc đã thực sự thực hiện: đọc hiểu mã/nguồn, thử Postman, đối chiếu response/database, giải thích scope/masking, guard/phê duyệt một lần và lịch sử bất biến. Không tự khai sinh viên đã làm khi chưa có bằng chứng.

## M. Checklist nghiệm thu32 tiêu chí

| # | Điều kiện | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
|1 |E09 đúng API Contract |PASS |U01/04/07/09,I01–03/21 |
|2 |E10 đúng API Contract |PASS |U06/10,I04–06/16/20 |
|3 |E11 đúng API Contract |PASS |U02/05/11/12,I07–12/19 |
|4 |E12 đúng API Contract |PASS |U08/13,I13/16/17 |
|5 |E13 đúng API Contract |PASS |U03/14/15,I14–20 |
|6 |Phân quyền NV/QL từng endpoint |PASS |I01/12–16 |
|7 |Center scope DEP-A/QT-14 |PASS |U04/09,I02/03/05/12/13/15 |
|8 |E09 filtering/sorting/pagination/total |PASS |I02/03/21, CTE cùng snapshot |
|9 |E10 dữ liệu ticket và snapshot |PASS |I04/06/16/20 |
|10 |E10 masking QT-15 |PASS |U06,I04; smoke build NV/QL |
|11 |Lịch sử khi parent soft delete |PASS |I16 đầy đủ E09–E13 |
|12 |E11 chỉ ticket chưa xác minh đủ điều kiện |PASS |U05,I07/08 |
|13 |E11 actor/time server |PASS |U11,I07/10/20 |
|14 |E11 giữ status/SLA/snapshot |PASS |I07/08/10/11/16/20 |
|15 |E11 không log giả |PASS |I07/10/16/20, hash log |
|16 |E11 chống lặp/concurrent bằng PG thật |PASS |I08/10/11 |
|17 |E11 từ chối trái quyền/giữ DB cho NFR02 |PASS |I12,N01–N09;9/9 đúng |
|18 |E12 history và pagination |PASS |I13/17 |
|19 |E13 đúng actor/time |PASS |I14/20 |
|20 |E13 không đổi status/SLA |PASS |I14/17/18/20 |
|21 |Trao đổi khi ticket chờ duyệt |PASS |U14,I13/14/20 |
|22 |Unit Phase5 PASS |PASS |15/15 |
|23 |HTTP integration Phase5 PASS |PASS |22/22 tình huống Express+PG |
|24 |PG integration/concurrency Phase5 PASS |PASS |I01–22, PG thật |
|25 |Liên thông E08–E13 PASS |PASS |I20 + smoke manual |
|26 |Regression Phase2–4 PASS |PASS |75 unit/HTTP +56 PG subtest cũ |
|27 |Type-check/build PASS |PASS |Exit0 cả hai |
|28 |Không sửa Frontend/Contract/migration cũ |PASS |So SHA256 baseline |
|29 |Public/credential không đổi |PASS |Hash toàn bộ hàng/sequence và hash file |
|30 |README/Postman/manual an toàn |PASS |manual:phase5 smoke+cleanup PASS |
|31 |Báo cáo/truy vết/AI đề xuất |PASS |C,F,H,I,L của báo cáo |
|32 |Không bảng/API/nghiệp vụ ngoài L2 |PASS |I01/22,6+1 bảng, đúng5 route mới |

PASS là cổng Phase5 Backend được giao, không thay thế nghiệm thu giảng viên/toàn bộ học phần.

## N. Kết luận

**PHASE 5 — HOÀN THÀNH.** E09–E13 cùng32 tiêu chí có bằng chứng, không blocker. Không sử dụng Git. Dừng sau Phase5 để sinh viên xem xét và quyết định bước tiếp theo; không tự chuyển Phase6.

