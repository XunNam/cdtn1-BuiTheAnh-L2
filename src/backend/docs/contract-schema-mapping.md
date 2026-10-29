# Ánh xạ API Contract – schema L2

**Ngày:** 2026-10-23 · **Giai đoạn:** 1 · **Kết luận:** HOÀN THÀNH VỀ THIẾT KẾ.

Baseline gồm [API v0.1](../../../docs/api-contract-l2.md) giữ nguyên, [phụ lục được sinh viên chấp thuận](../../../docs/api-contract-l2-extension.md), [DDL cuối](../../../docs/schema.sql) và [quyết định hiện hành](../../../docs/progress/backend/decision-log.md). Yêu cầu “Chốt các quyết định thiết kế và hoàn tất Phase 1” ngày 2026-10-23 đã duyệt DEP-A, DD02/03/05/06/07/08, DEP-RANGE, AUTH và CRUD. Đây không phải phê duyệt của giảng viên hoặc bằng chứng hệ thống đã chạy.

## 1. Nguồn và quy ước kết luận

Nguồn PDF nằm trong Local Project đồng bộ tại `C:\Users\buith\.codex\.chatgpt-projects\g-p-6ab4ea4708e881919df5b65663772419`. Các đường dẫn `sources/`, `ref/`, `docs/BC T04.pdf` trong bảng dưới tính từ đó, không phải từ repository ổ D. Không sao chép, sửa hay trích xuất thành tệp mới các PDF này. Số trang dưới đây đã kiểm tra theo trang PDF.

| Mã | Nguồn đã đọc | Phần dùng cho Giai đoạn 1 |
| --- | --- | --- |
| CS | `sources/CDTN1_Mekong Mobile_Case study Smart CRM.pdf`, 23 trang | Mục 2.2/Bảng 2.1 tr. 3; Mục 3/Bảng 3.1 tr. 5; Mục 4 tr. 6–7; Mục 5.1/Hình 5.1 tr. 8; Mục 6.1–6.2/Hình 6.2 tr. 10–11; L2 tr. 12; từ điển customer/device/ticket/log tr. 15–16; Bảng 9.1 tr. 19; phạm vi tr. 21; Bảng 11.1 và hướng dẫn dữ liệu tr. 22–23 |
| BT1 | `docs/BC T04.pdf`, 31 trang | Phạm vi tr. 6, 8 US tr. 7; actor tr. 8; FR/AC tr. 9–17; NFR tr. 18–19; lập luận kiến trúc tr. 20; truy vết tr. 22; UC ngoại lệ tr. 23–24; QT tr. 25; DDL skeleton tr. 27–28. Sơ đồ dạng hình ở tr. 21/29 không dùng làm bằng chứng chi tiết cột; đối chiếu bản DBML trong repo |
| SRS | Repository `docs/srs.md` | FR01–08, NFR01–03, Mục 6 truy vết và Mục 7 QT. Đây là bản văn bản có phân trang riêng, không gán trang của nó cho PDF BT1 |
| API | Repository `docs/api-contract-l2.md` | Đã đọc toàn bộ, nhất là Mục 2–5, 7.1–7.13, 8–12; 13 endpoint và ma trận quyền |
| DDL/ERD | Repository `docs/schema.sql`, `docs/diagrams/erd.dbml` | Sáu bảng trước thay đổi; DBML không bị chỉnh sửa trong lượt này |
| BT2 | `sources/CDTN1_De bai Bai tap 2 - Hien thuc hoa module cot loi.pdf`, 11 trang | Mục 2.1–2.2 tr. 3: hai thực thể CRUD, ba loại test, migration/seed; Mục 2.3–2.4 tr. 4 và tiếp tr. 5: đăng nhập cơ bản, tái lập; Mục 2.5–2.6 tr. 5: thay đổi thiết kế/AI; Mục 4.1–4.3 tr. 8–9: S1–S4 và cách kiểm chứng |
| B05 | `sources/CDTN1_Buoi05_Thiet ke kien truc va Mo hinh du lieu.pdf` | Trang PDF 6–8: phân lớp; 18/20/22: truy vết thực thể, chuẩn hóa, lỗi dữ liệu |
| TH05 | `sources/CDTN1_Buoi05_Tai lieu tu hoc_Mo hinh du lieu theo chuyen nganh.pdf` | Phần A1–A4, tr. 2–4: PK/FK, DDL, index có truy vấn phục vụ, 4–6 bảng |
| B06 | `sources/CDTN1_Buoi06_Workshop thiet ke va Nop Bai tap 1.pdf` | Trang PDF 4/6/8: thiết kế theo truy vết, 4–6 bảng, nhất quán hồ sơ |
| B07 | `sources/CDTN1_Buoi07_Xay dung module cot loi.pdf` | Trang PDF 5/7/11/13–14: cấu trúc lớp, validation, QT-05, xử lý lỗi |
| TH07 | `sources/CDTN1_Buoi 07_Tai lieu tu hoc_Module cot loi theo chuyen nganh.pdf` | Phần A1–A6 tr. 3–10: migration, repository/service, test độc lập |
| B08 | `sources/CDTN1_Buoi08_Workshop xay dung module cot loi Sprint 1.pdf` | Trang PDF 5–7: nhật ký thay đổi, mẫu báo cáo thay đổi, triển khai từng module |
| B09 | `ref/CDTN1_Buoi09_Giao tiep giua cac thanh phan.pdf` | Trang PDF 5–6/10–13/27/29: contract, validation, tích hợp, contract test |
| TH09 | `ref/CDTN1_Buoi09_Tai lieu tu hoc_Trinh bay ket qua theo chuyen nganh.pdf` | Phần A1 tr. 2, A5 tr. 5 và D1–D3 tr. 14–15: client/token, contract và test ranh giới |

**SOURCE** = quy định học phần/nghiệp vụ; **DESIGN** = hồ sơ thiết kế hoặc quyết định kỹ thuật trong phạm vi đã giao; **IMPLEMENTATION** = điều quan sát được từ tệp/code, không suy ra chạy thành công; **INFERENCE** = suy luận; **PROPOSAL** = lựa chọn còn chờ xác nhận. “Đã đủ căn cứ” khác “sinh viên đã phê duyệt DD”.

## 2. Khác biệt baseline và cách xử lý

| Điểm | Bằng chứng | Xử lý trong lượt này |
| --- | --- | --- |
| Tên đường dẫn contract | Kế hoạch gọi `docs/API_Contract_L2.md`; repo chỉ có `docs/api-contract-l2.md`. Bản Project có tên cũ, nội dung bằng bản repo sau chuẩn hóa xuống dòng | Dùng tệp thật của repo; không đổi tên hoặc sửa kế hoạch |
| Hồ sơ mới hơn | Contract Mục 1.1 dẫn bản BC T04(1) 22 trang; Project có BC T04 31 trang | Dùng nội dung FR/AC/NFR/UC của bản 31 trang để đối chiếu, không giả định ngày phê duyệt/nhận xét GV |
| Mã UC chưa đồng bộ | BT1 tr. 22: FR06→UC06, FR07→UC07, FR08→UC08; tr. 24 ghi UC06 phê duyệt. SRS/API: FR06→UC07, FR07→UC11, FR08→UC06 | Theo xác nhận của sinh viên và kế hoạch: dùng mã API; giữ nguyên PDF/sơ đồ gốc, ghi sai lệch để đồng bộ riêng |
| Tạo phiếu thiếu ngày mua | BT1 Mục 8.1 tr. 23–24 đã ghi tạo MOI, tính hạn và chờ duyệt | DD01 về thứ tự không còn là suy đoán; tên trạng thái API là cách biểu diễn kỹ thuật |
| Số lượng US | CS tr. 21/TH05 gợi ý 5–7; baseline được sinh viên xác nhận có 8, gồm 6 MUST/2 SHOULD | Giữ 8 FR/US; không tự giảm hay đổi ưu tiên; không khẳng định đã có chấp thuận GV cho mọi sai lệch rubric |
| Ví dụ không phải quy tắc của L2 | B05 tr. 7 minh họa 48 giờ và nhãn QT-01 cho bảo hành. TH07 tr. 5 gắn SLA QT-08, phiếu mở QT-09 và dùng COUNT+1; tr. 7–8 có serial 6–40, trạng thái MOI_TIEP_NHAN. B09 tr. 11–12 minh họa 422/error phẳng | Lấy nguyên tắc kiến trúc; giữ QT theo CS Bảng 9.1, SLA 24/72/120, serial 1–50, MOI, lỗi lồng và 400 theo API. Không thêm chặn hai phiếu mở, phân công hay mã QT từ ví dụ |
| `is_warranty` | CS tr. 16 là cờ miễn phí/có phí; API Mục 4.2 bàn về biểu diễn chưa xác minh; DDL/BT1 đã dùng warranty_status ba giá trị | Không thêm cờ miễn phí, không đồng nhất phê duyệt với còn bảo hành; thu phí nằm ngoài L2 |
| Actor log ban đầu | API Mục 7.8 diễn đạt `created_by` trong log; Mục 4.2 và DDL/CS đều là `changed_by` | Ánh xạ principal.employee_id → ticket_status_log.changed_by; không thêm cột created_by trùng nghĩa |
| Quyền đọc trao đổi của quản lý | API E10/E12/Mục 9 có; bảng actor BT1 tr. 8 và sơ đồ chưa mô tả đầy đủ | Ghi ROLE-DOC là việc đồng bộ hồ sơ riêng; không sửa actor/UC gốc, không tự cấp thêm quyền ngoài ma trận API |


Phụ lục hiện hành mở rộng bốn PATCH/DELETE và login theo ủy quyền mới; các câu “không có DELETE/chưa chọn login/cần xác nhận DD” trong API v0.1 là nội dung lịch sử của bản gốc, được decision log/phụ lục bổ sung khi triển khai. Không sửa nội dung nguyên bản để che sai lệch.

## 3. Sáu bảng và dữ liệu phụ trợ

**IMPLEMENTATION quan sát tệp:** DDL thiết kế có 6 bảng, 51 cột, 6 PK, 5 FK lõi và 5 index tường minh; chưa có PostgreSQL runtime. Backend thử nghiệm trong src/backend/src/data/store.ts vẫn là dữ liệu mảng; chưa thay bằng repository/service/auth. Cổng thử nghiệm 4000 khác base URL đề xuất 3001, sẽ cấu hình khi hiện thực.

| Bảng | Toàn bộ cột DDL | Vai trò / lưu ý |
| --- | --- | --- |
| customer (7) | customer_id, full_name, phone, center_id, address, created_at, deleted_at | FR01/07; center sở hữu bất biến, phone UNIQUE toàn cục |
| device (7) | device_id, customer_id, product_id, serial_no, purchase_date, warranty_months, deleted_at | FR02/04; chủ/product/serial/months bất biến trong CRUD; ngày mua nullable |
| issue_category (4) | category_id, category_name, default_priority, is_active | FR03; sáu mã, không tự chọn priority thay nhân viên |
| ticket (21) | ticket_id, ticket_code, device_id, center_id, received_by, category_id, issue_desc, priority, status, received_at, due_date, warranty_status, assessed_on, purchase_date_snapshot, warranty_months_snapshot, warranty_expires_on, approval_status, approved_by, approved_at, approval_note, deleted_at | FR02–06; snapshot và approval riêng, customer_id suy ra qua device |
| ticket_status_log (7) | log_id, ticket_id, from_status, to_status, changed_at, changed_by, note | QT-06, log ban đầu NULL→MOI cùng transaction |
| ticket_communication (5) | communication_id, ticket_id, content, created_at, created_by | FR08; nối tiếp, không ghi đè, không dùng log thay trao đổi |

**DESIGN DEP-A:** products/centers/accounts/membership là config tin cậy có version, chưa được tạo/nạp thực tế. Không có bảng product/employee/service_center/employee_center/account/session/token. Chỉ dự kiến thêm một schema_migration kỹ thuật ở Phase 2, không nằm trong DDL sáu bảng hiện tại.

| Tham chiếu | Nơi lưu / nguồn đọc | Kiểm toàn vẹn và phạm vi |
| --- | --- | --- |
| product_id | device.product_id; products config có ID/tên/months/is_active | E04 phải tồn tại/active, months nguyên 0–120 lấy config rồi lưu device. E05 chỉ product active. Không FK SQL, không đoán từ serial |
| center_id | customer.center_id, ticket.center_id; centers config | Tạo customer từ principal.active_center_id; ticket center request phải khớp active center và customer scope; không client tự khai quyền |
| received_by | ticket.received_by→accounts.employee_id | Principal NV đã xác thực, đúng center; không FK account |
| approved_by | ticket.approved_by→accounts.employee_id | Principal QL đúng allowed centers, actor/time server; không suy role lịch sử từ role hiện tại |
| changed_by | ticket_status_log.changed_by→accounts.employee_id | Log đầu cùng principal received_by; không thêm created_by cho log |
| created_by | ticket_communication.created_by→accounts.employee_id | Principal NV có quyền ticket; timestamp server |
| role/active_center_id/allowed_center_ids | Accounts/membership config, principal server qua session | Không đọc quyền từ body/query/header tự khai. Backend restart làm token cũ mất hiệu lực |

Startup kiểm kiểu/ID trùng/username/membership/miền tháng/credential và DISTINCT ID phụ trợ trong DB, bao gồm tombstone/lịch sử; ID đã dùng không được đổi nghĩa hoặc xóa. Config bất biến trong process; cập nhật ngoại tuyến phải đối chiếu bản cũ/bản mới, tăng version và restart. **Bỏ fingerprint và metadata reference_config_* trong schema_migration**. Không tự phát hiện được tái sử dụng cùng ID trái quy trình; SQL ngoài service có thể bỏ qua kiểm config. Đây là giới hạn đã ghi nhận, không phải FK PostgreSQL.

## 4. Ma trận đầy đủ E01–E13

Ký hiệu dữ liệu: **L** lưu trong DDL; **S** snapshot lưu tại tiếp nhận; **D** suy ra/serialize; **C** config DEP-A theo thiết kế, chưa hiện thực; **V** đầu vào tạm không lưu. Không còn trường mang P vì các quyết định cần cho schema đã được duyệt. NV = NHAN_VIEN_TIEP_NHAN; QL = QUAN_LY_TTBH. KT là tình huống kiểm thử dự kiến, chưa chạy API.

| API / vai trò | Toàn bộ request hợp lệ | Response thành công → nguồn | Ghi / bảo vệ / kiểm chứng dự kiến |
| --- | --- | --- | --- |
| E01 GET /customers; NV | Query phone **V**, raw 1–30, cùng chuẩn hóa QT-02 | Customer: customer_id/full_name/phone/address/created_at từ customer **L**; phone che **D** | Không ghi; scope customer.center_id, deleted_at NULL; FR01/US01/UC01, QT-01/02/14/15; KT01 cùng phone→cùng ID, sai400, thiếu/ngừng/ngoài quyền404 |
| E02 POST /customers; NV | Body full_name/phone/address **L**; address bỏ qua/null→NULL; center từ principal **C** | customer_id/full_name/phone/address/created_at từ customer **L**, phone che **D**; 409 existing_customer cùng serializer khi được đọc | INSERT customer; phone UNIQUE kể cả tombstone. Xung đột ngoài quyền không trả ID/tên/phone; FR07/US07/UC11; QT-01/02/13–15; KT02 đồng thời chỉ một201 |
| E03 GET /customers/{customer_id}/devices; NV | Path customer_id; query serial_no exact, page, size **V** | Device: device_id/customer_id/product_id/serial_no/purchase_date/warranty_months từ device **L**; meta.page/size/total **D** | Parent/device active, customer scope; serial case-sensitive và giữ số0; sort device_id tăng. FR02/US02/UC02, QT-03/14; KT03 không thiết bị200[], parent thiếu404 |
| E04 POST /customers/{customer_id}/devices; NV | Path customer_id; body product_id/serial_no/purchase_date→device **L**, product kiểm **C**, months server lấy **C** | device_id/customer_id/product_id/serial_no/purchase_date/warranty_months từ device **L**; 409 existing_device chỉ khi active và có quyền | Khóa customer active rồi INSERT, serial UNIQUE toàn cục; product inactive/thiếu404, tương lai400, sai chủ409 không lộ hồ sơ. FR02/US02/UC02; DD07; QT-03/05/14; AC E04-01..10 phụ lục |
| E05 GET /products; NV | Query page/size **V** | product_id/product_name/warranty_months từ products **C**; meta.page/size/total **D** | Không SQL product; lọc active, sort product_id tăng, danh mục chung. FR02/04, US02/04, UC02/04; KT05 query sai400, cấu hình không dùng được CONFIGURATION_ERROR |
| E06 GET /issue-categories; NV | Không query/body | category_id từ issue_category **L**; category_name nhãn tiếng Việt từ mã **D** | is_active=true, sort category_id tăng; danh mục chung. FR03/US03/UC03; CS Bảng 3.1; KT06 sáu nhãn, query lạ400, QL403 |
| E07 GET /devices/{device_id}/warranty; NV | Path device_id; query assessment_date **V** hoặc ngày Clock server | device_id/purchase_date/warranty_months **L**; assessed_on/warranty_expires_on/warranty_status/requires_approval **D** | Parent/device active và scope; không ghi preview. DD05/DEP-RANGE đã chốt. FR04/US04/UC04, QT-05; KT07 tháng lịch/0 tháng/ngày cuối/ngày sau/thiếu ngày; assessment trước mua400 |
| E08 POST /tickets; NV | Body customer_id **V/D** kiểm đúng chủ; device_id/center_id/issue_desc/category_id/priority→ticket **L**; center **C**, actor/time server | Ticket đầy đủ: ticket_id/ticket_code/customer_id/device_id/center_id/issue_desc/category_id/priority/status/received_at/due_date/assessed_on/purchase_date_snapshot/warranty_months_snapshot/warranty_expires_on/warranty_status/approval_status/approved_by/approved_at/approval_note/can_proceed **L/S/D** | Một transaction ticket+log, khóa customer→device→category active; principal→received_by/changed_by. DD02/05/06, QT-03–06/14, FR02–05/US02–05/UC02–05. KT08 thiếu mua và hết hạn đều201 theo ma trận, rollback khi log lỗi |
| E09 GET /tickets; QL | Query approval_status=CHO_PHE_DUYET mặc định hoặc DA_PHE_DUYET; page/size **V** | ticket_id/ticket_code/customer_id/device_id/center_id/warranty_status/approval_status/status/received_at/due_date/can_proceed **L/D**, meta.page/size/total **D** | Chỉ CHUA_XAC_MINH, ticket.deleted_at NULL, scope trước count/pagination; sort received_at,ticket_id tăng. Không lọc deleted_at của cha. FR06/US06/UC07; QT-05/14; KT09 NV403, ngoài scope không xuất hiện |
| E10 GET /tickets/{ticket_id}; NV/QL | Path ticket_id **V** | Ticket đầy đủ như E08; customer.customer_id/full_name/phone từ device→customer **L/D**; device.device_id/serial_no/product_id **L** | Ticket active/scope; join cha kể cả tombstone, phone theo role; snapshot không tính lại. FR06/08, US06/08, UC07/06; QT-14/15; KT10 đổi ngày mua/ngày xem không đổi snapshot |
| E11 POST /tickets/{ticket_id}/warranty-approval; QL | Path ticket_id; body note optional trim1–1000/null/bỏ→NULL, ánh xạ approval_note **L**; body{} hợp lệ | ticket_id/status/warranty_status/approval_status/approved_by/approved_at/approval_note **L**, can_proceed **D** | Khóa ticket, chỉ CHUA_XAC_MINH+CHO_PHE_DUYET+MOI, guard UPDATE; không đổi status/SLA/snapshot, không log giả. Cha tombstone không cấm. FR06/US06/UC07/NFR02, QT-05/14; KT11 một200/một409 khi duyệt đồng thời |
| E12 GET /tickets/{ticket_id}/communications; NV/QL | Path ticket_id; query page/size **V** | communication_id/ticket_id/content/created_at/created_by từ communication **L**, meta.page/size/total **D** | Ticket active/scope, không lọc cha tombstone; sort created_at,communication_id tăng. FR08/US08/UC06, QT-14; KT12 ticket thiếu404 khác không trao đổi200[] |
| E13 POST /tickets/{ticket_id}/communications; NV | Path ticket_id; body content→communication **L**; actor/time server | communication_id/ticket_id/content/created_at/created_by **L** | Khóa ticket/kiểm scope rồi INSERT nối tiếp; cha tombstone và chờ duyệt không cấm. Không đổi status/SLA, không gửi SMS/email. FR08/US08/UC06, QT-14; KT13 rỗng400, QL403, không ghi khi lỗi |

Mọi request đều có token ngoại trừ login phụ lục; sai/thiếu/hết hạn→401; sai role→403 trước tra tài nguyên; ID ngoài scope→404. E05/E06 không lọc từng bản ghi danh mục theo trung tâm. Các danh sách dùng page>=1,size1–100, mặc định1/20, total sau scope/bộ lọc, trang ngoài phạm vi200[]. Body/query lạ và ID không nguyên dương an toàn JavaScript→400; body sai Content-Type→415; lỗi nội bộ500 không lộ SQL/stack/credential/token. Lỗi riêng từng E giữ nguyên API gốc.

## 5. Từ điển lưu, suy ra và snapshot

| Nhóm | Quy tắc field / nullability |
| --- | --- |
| Customer response | customer_id BIGINT PK; full_name VARCHAR(120) NOT NULL; phone VARCHAR(20) NOT NULL UNIQUE regex10 chữ số; address VARCHAR(255) NULL; created_at TIMESTAMPTZ NOT NULL. center_id BIGINT>0 NOT NULL và deleted_at TIMESTAMPTZ NULL là nội bộ, không tự thêm vào response v0.1 |
| Device response | device_id PK, customer_id FK NOT NULL; product_id BIGINT>0 NOT NULL kiểm config; serial_no VARCHAR(50) NOT NULL UNIQUE; purchase_date DATE NULL; warranty_months SMALLINT NOT NULL 0–120, **không DEFAULT**. deleted_at TIMESTAMPTZ NULL không trả tùy tiện |
| Product response | product_id/product_name/warranty_months lấy config, chỉ is_active=true; không chứa credential hay account. Product name không suy từ serial |
| Category response | category_id lưu; category_name từ MAN_HINH/PIN/SAC/PHAN_MEM/NUOC_VAO/KHAC→Màn hình/Pin/Sạc/Phần mềm/Nước vào/Khác; không trả default_priority/is_active nếu contract không có |
| Ticket định danh / phân loại | ticket_id PK; ticket_code VARCHAR(20) NOT NULL UNIQUE sinh từ sequence; device_id/category_id FK NOT NULL; customer_id **D** qua chủ device bất biến; center_id BIGINT>0 kiểm config; issue_desc TEXT 1–2000 sau trim; priority CAO/TRUNG_BINH/THAP bắt buộc, không default |
| Ticket vòng đời / thời gian | status giữ enum BT1, E08 tạo MOI; received_at TIMESTAMPTZ server; due_date TIMESTAMPTZ>received_at theo DD06; không endpoint sửa vòng đời. received_by BIGINT>0 server là nội bộ |
| Ticket snapshot **S** | assessed_on DATE NOT NULL từ ngày địa phương received_at; purchase_date_snapshot DATE NULL; warranty_months_snapshot SMALLINT NOT NULL 0–120 từ device; warranty_expires_on DATE NULL; warranty_status enum CON_BAO_HANH/HET_BAO_HANH/CHUA_XAC_MINH. Thiếu ngày mua thì purchase/expiry NULL; đã xác định thì có cả hai, purchase<=assessed_on và expiry>=purchase |
| Ticket approval | approval_status NOT NULL enum KHONG_CAN/CHO_PHE_DUYET/DA_PHE_DUYET; approved_by BIGINT>0 NULL hoặc actor quản lý; approved_at TIMESTAMPTZ NULL hoặc >=received_at; approval_note VARCHAR(1000) NULL hoặc không rỗng. Chỉ DA_PHE_DUYET có actor/time, note tùy chọn; các trường hợp khác tất cả NULL |
| Ticket field suy ra **D** | can_proceed=true khi KHONG_CAN/DA_PHE_DUYET; requires_approval ở E07=true khi CHUA_XAC_MINH; không thêm cột boolean trùng, không suy miễn phí. E10 customer/device là hồ sơ hiện tại; chỉ snapshot bảo hành là dữ kiện lịch sử |
| Communication | communication_id PK, ticket_id FK NOT NULL; content TEXT NOT NULL 1–2000 sau trim; created_at TIMESTAMPTZ server, created_by BIGINT>0 principal. Không endpoint sửa/xóa trao đổi |
| Log nội bộ | log_id PK, ticket_id FK; from_status nullable, to_status NOT NULL; changed_at TIMESTAMPTZ, changed_by BIGINT>0 principal, note VARCHAR(255) nullable; log đầu NULL→MOI. Không thêm vào response nếu contract không có |
| Pagination **D** | meta.page/size từ query hợp lệ; total từ COUNT cùng scope/bộ lọc như danh sách; không có bảng phân trang |

**Unicode DD08:** dùng đúng 25 code point trim ECMAScript ghi trong phụ lục Mục 2; đếm code point sau trim, không UTF-16 length hoặc grapheme. Không NFC normalize; reject NUL/unpaired surrogate ở validator. SQL char_length+btrim cùng tập trim bảo vệ 1–2000; service lưu chuỗi đã trim. Tên/serial/ghi chú có độ dài riêng theo API, không tự đổi thành giới hạn 2000.

## 6. Ràng buộc, index và ma trận trạng thái

| Thành phần | Thiết kế cuối / giới hạn |
| --- | --- |
| 6 PK identity, 4 UNIQUE cột | UNIQUE phone/serial/ticket_code/category_name. Giữ phone/serial sau soft delete; không thêm index phone trùng UNIQUE |
| 5 FK RESTRICT | device.customer_id→customer; ticket.device_id→device; ticket.category_id→issue_category; log.ticket_id→ticket; communication.ticket_id→ticket. Không FK config |
| CHECK dữ liệu | ID phụ trợ>0, phone regex, serial/tên không rỗng, enum, months0–120 cả device/snapshot, text1–2000 sau trim; ngày tương lai vẫn do service kiểm |
| Snapshot CHECK | chk_ticket_snapshot_presence/dates giữ nullability/thứ tự ngày; chk_ticket_assessment_result buộc CON khi assessed_on<=expiry, HET khi assessed_on>expiry; service tính tháng lịch, SQL không tự tính lại ngày hiện tại |
| Approval CHECK | chk_ticket_approval_pair/time/metadata và chk_ticket_warranty_approval bảo vệ ma trận dưới. CHECK không kiểm role/center và không tự cấm UPDATE snapshot |
| Log CHECK / unique | chk_log_initial/change, idx_ticket_initial_log unique partial from_status IS NULL: tối đa một log đầu; transaction service bảo đảm có log |
| idx_device_customer | (customer_id,device_id) cho E03/filter/sort |
| idx_ticket_approval_list | (center_id,approval_status,received_at,ticket_id) partial CHUA_XAC_MINH & deleted_at IS NULL cho E09 cả chờ/đã duyệt |
| idx_ticket_status_log_time | (ticket_id,changed_at,log_id), thứ tự xác định theo QT-06 |
| idx_ticket_communication_time | (ticket_id,created_at,communication_id) cho E12 |

| warranty_status | approval_status | can_proceed | Điều kiện |
| --- | --- | --- | --- |
| CON_BAO_HANH | KHONG_CAN | true | Có snapshot ngày mua/expiry; đánh giá<=expiry |
| HET_BAO_HANH | KHONG_CAN | true | Có snapshot ngày mua/expiry; đánh giá>expiry |
| CHUA_XAC_MINH | CHO_PHE_DUYET | false | Ngày mua/expiry NULL, không metadata phê duyệt |
| CHUA_XAC_MINH | DA_PHE_DUYET | true | Ngày mua/expiry vẫn NULL, có actor/time phê duyệt |

Không unique “mỗi thiết bị một phiếu mở”, không trigger SLA/phê duyệt. FK RESTRICT chỉ ngăn xóa hàng đang được tham chiếu; policy repository/service không phát SQL DELETE vật lý cho dữ liệu nghiệp vụ, log/communication nối tiếp và E11 chỉ đổi metadata approval. Không tuyên bố SQL ngăn mọi sửa lịch sử nếu người khác chạy SQL trực tiếp.

## 7. Ánh xạ phụ lục và CRUD

| Mã phụ lục | Request / nguồn / kết quả | Truy vết và AC |
| --- | --- | --- |
| A01 POST /api/auth/login | username/password; accounts config + private scrypt credential→session Map digest token; 200 access_token/token_type/expires_in/expires_at/principal. Không ghi SQL | BT2 tr. 4, NFR02, QT-14; dependency của E01–E13. AUTH, AC A01: login/401/TTLboundary/restart/cap/không lộ secret |
| CU PATCH /api/customers/{customer_id} | full_name/address whitelist→customer đang active và đúng center; 200 Customer v0.1 đã che phone | Bổ sung update cho cặp E02 create/E01 read: BT2 CRUD, liên quan FR01/07, US01/07, UC01/11; QT-13/14/15; AC CU |
| CD DELETE /api/customers/{customer_id} | Không body; chỉ set customer.deleted_at; 204, lặp204 giữ timestamp; không cascade/phone reuse | Bổ sung delete cho BT2 Customer; cùng truy vết CU; AC CD gồm phiếu mở vẫn ngừng được, lịch sử giữ |
| DU PATCH /api/customers/{customer_id}/devices/{device_id} | purchase_date hợp lệ/null, whitelist; active cha/con, đúng quan hệ/center; 200 Device v0.1. Không đổi ticket snapshot | Bổ sung update cho E04 create/E03 read: BT2 Device, liên quan FR02/04, US02/04, UC02/04; QT-03/05/13/14; AC DU |
| DD DELETE /api/customers/{customer_id}/devices/{device_id} | Không body; set device.deleted_at; 204, lặp204; cha đã ngừng vẫn cho DELETE đúng quyền/quan hệ, không cascade/serial reuse | Bổ sung delete cho BT2 Device; cùng truy vết DU; AC DD |
| AC E04-01..10, E05-01, TEXT-01/02 | Thiết bị mới/product thiếu/product inactive/serial cùng chủ/khác chủ/thiếu ngày mua/ngày tương lai/months tường minh/đồng thời/miền0–120; text Unicode biên | FR02/04, DD07/08/DEP-RANGE, QT-03/05; test dự kiến, không đổi 8 FR/US |

Bốn CRUD chỉ NV, QL403; token thiếu401; thiếu/sai quan hệ/ngoài quyền404. PATCH bắt đầu sau soft delete404, đang chạy mà mất active trước khóa/guard409 RESOURCE_CHANGED. Hai PATCH hợp lệ tuần tự theo khóa, trường gửi cuối thắng. DELETE lặp204 kể cả còn phiếu mở/tham chiếu, không tự thêm409 vì lý do này. Semantics/status/response/AC chi tiết trong phụ lục, không gán mã E14+.

**Ranh giới active và lịch sử:** E01/E03/E07 và E04/E08 phục vụ tiếp nhận mới phải kiểm customer/device chưa ngừng. E09–E13 kiểm ticket.deleted_at và quyền ticket, không loại ticket vì customer/device.deleted_at khác NULL. E11/E13 hợp lệ vẫn thực hiện; PATCH ngày mua không cập nhật snapshot/expiry/SLA của phiếu cũ. Khóa/guard trên cùng connection bảo vệ E08 trước PATCH/DELETE đồng thời; không xóa vật lý hoặc làm mất lịch sử để đơn giản CRUD.

## 8. Truy vết quy tắc → thực thi → kiểm chứng dự kiến

| QT / phạm vi | Điều kiện và kết quả đúng | Thành phần / tình huống kiểm thử |
| --- | --- | --- |
| QT-01/02 trực tiếp | Phone chuẩn hóa một hồ sơ, UNIQUE toàn cục kể cả tombstone; sai400/trùng409 không lộ ngoài quyền | Customer service + validator + SQL UNIQUE/CHECK; KT01/02, CU/CD, đồng thời |
| QT-03 trực tiếp | Serial đúng chủ; trùng không đổi chủ, E08 customer/device khớp | Device/ticket service, FK/UNIQUE; KT03/04/08, DU/DD |
| QT-04 trực tiếp | SLA24/72/120 giờ thứ Hai–Bảy, DD06/biênChủ nhật; không tính lại khi duyệt | Hàm SLA + now; bảng 11 vector trong kiến trúc, KT08/11 |
| QT-05 trực tiếp | Thiếu mua→chờ rồi duyệt; hết hạn theo DD02; cộng tháng theo DD05, 0–120 tháng | Service warranty/approval, snapshot CHECK; KT07/08/11, biên tháng/năm nhuận/0 tháng |
| QT-06 phần L2 | Ticket và log NULL→MOI cùng commit; duyệt/trao đổi không log giả | withTransaction + FK/unique log; rollback KT08, KT11/13 |
| QT-07/08/09 ngoài L2 | Phân công/kỹ năng/linh kiện là luồng sau | NOT APPLICABLE; không lấy ví dụ “phiếu mở QT-09” làm quy tắc mới |
| QT-10/11/12 ngoài L2 | Khảo sát/dự báo/phân khúc ngoài prototype | NOT APPLICABLE, không bảng/module bổ sung |
| QT-13 trực tiếp | Soft delete hồ sơ đầu vào, bảo toàn ticket/lịch sử/UNIQUE; không SQL DELETE vật lý | Service/repository policy, CD/DD, ticket lịch sử E09–E13, rollback và snapshot bất biến |
| QT-14 xuyên suốt | Principal server, NV active center, QL allowed centers; 401/403/404 trước ghi; scope trước phân trang | AUTH+service/SQL scope; KT01–13, CU/CD/DU/DD, giả role/center và nhiều trung tâm |
| QT-15 xuyên suốt | NV nhận phone che kể cả error/existing_customer, QL đầy đủ khi đúng quyền; hồ sơ ngoài scope không lộ | Serializer dùng chung, không log phone đầy đủ; KT01/02/10 và CU/CD |

Các thuật toán/bộ dữ liệu/khóa/seed theo [kiến trúc](backend-architecture-phase-01.md); quyết định theo [decision log](../../../docs/progress/backend/decision-log.md); kết quả kiểm tĩnh tại [báo cáo Phase 1](../../../docs/progress/backend/phase-01.md).

NFR01 cần 100 lượt đo UI với 200 phiếu, NFR02 cần HTTP và kiểm DB trước/sau request lỗi, NFR03 cần UI/API/DB khởi động tối đa hai lệnh sau chuẩn bị. Index, contract và đặc tả không chứng minh các NFR đã đạt. Không còn blocker thiết kế schema; kiểm PostgreSQL/API/config/migration/seed thật chưa chạy và chỉ tiếp tục khi có yêu cầu Phase 2.

## SC-DB — Bổ sung sau FE-07, 2026-10-25

Các bảng và mô tả DEP-A bên trên là baseline Phase1. Theo yêu cầu mới và xác nhận chỉ chuyển hai trung tâm, danh mục centers hiện được lưu trong service_center qua migration003; customer/ticket có FK mới. loadReference(file,pool) lấy centers từ repository DB và kiểm membership; JSON version2 chỉ còn products/accounts. Auth kiểm is_active DB ở login/request, E08 recheck trung tâm trong transaction.

A01/E01–E13 vẫn giữ nguyên method/path/field/status/quyền; active_center_id/allowed_center_ids vẫn từ tài khoản đã xác thực, center_id hợp lệ đối chiếu DB. Không thêm endpoint quản trị hoặc lấy tên trung tâm cho frontend; phần trình bày hiện vẫn ID theo contract. Product/account/actor ID còn config, không FK mới cho chúng. Sáu bảng lõi không đổi; thêm một danh mục phụ thuộc, không nhập CSV. [Báo cáo](../../../docs/progress/backend/service-centers-postgresql.md).

## CSV-03 / TD-23 — email nội bộ (2026-10-26)

Schema đích thêm customer.email TEXT NULL qua004, không UNIQUE; đây là dependency CSV sinh viên chọn lưu, không request/response mới của E01–E04. DTO/whitelist/PATCH giữ nguyên, importer repository nhận thêm email/created_at/center từ bundle đã kiểm. Device giữ owner/product/months tin cậy, purchase_date=NULL nếu nguồn thiếu. Không nhập lịch sử ticket/log.

Startup chấp nhận003 hoặc004 với checksum đúng, chỉ004 được phép pending; importer yêu cầu email/catalog trước ghi, CLI public apply bị chặn. Không bảng/endpoint mới, không sửa contract gốc/Frontend. [Hướng dẫn](customer-device-import.md), [báo cáo](../../../docs/progress/data-import/csv-03.md).
