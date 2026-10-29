# Nhật ký thay đổi thiết kế so với BT1

**Cập nhật:** 2026-10-23 · **Giai đoạn:** 1 · **Trạng thái:** HOÀN THÀNH VỀ THIẾT KẾ.

Baseline đối chiếu: DDL/ERD DBML ban đầu và BC T04.pdf bản31 trang, Mục11 tr.27–28 trong Project đồng bộ. Nguồn quyết định mới là yêu cầu **“Chốt các quyết định thiết kế và hoàn tất Phase 1”** ngày2026-10-23 của sinh viên; không gán phê duyệt mới cho giảng viên. Chỉ cập nhật thiết kế/schema được giao, chưa có migration hoặc DB thật.

**Cách đọc lịch sử:** TD-01–TD-06 dưới đây ghi các lượt trước. Những câu “chưa duyệt/chờ quyết định”, miền chỉ>=0 và đề xuất fingerprint trong các mục lịch sử được thay thế bởi TD-07–TD-11 hiện hành; không còn là blocker thiết kế. [Decision log](progress/backend/decision-log.md) là bảng trạng thái hiện tại.

## TD-01 — Bổ sung địa chỉ khách hàng

- **Thay đổi gì:** Thêm customer.address VARCHAR(255) NULL vào DDL.
- **Vì sao:** API E01/E02 và existing_customer trả/nhận address; CS Mục 8 tr. 15 có trường này nhưng skeleton BT1 thiếu. Bỏ qua/null giữ NULL, không thêm bảng địa chỉ.
- **Ảnh hưởng:** FR01/US01/UC01, FR07/US07/UC11; schema, serializer và test contract tương lai. ERD/DBML/PDF gốc chưa sửa theo giới hạn tác vụ; cần đồng bộ riêng trước bài nộp.

## TD-02 — Lưu kết quả bảo hành tại tiếp nhận

- **Thay đổi gì:** Thêm ticket.assessed_on, purchase_date_snapshot, warranty_months_snapshot, warranty_expires_on; giữ warranty_status ba giá trị đã có. CHECK bảo vệ sự có/không của snapshot và thứ tự ngày cơ bản.
- **Vì sao:** API E08/E10 và yêu cầu Giai đoạn 1 cần đọc lại đúng kết quả lúc tạo, không tính lại theo device/ngày xem; FR04/FR05 và QT-05. Snapshot mô tả sự kiện lịch sử nên không trùng nghĩa “giá trị hiện tại” của device/product.
- **Ảnh hưởng:** FR04/US04/UC04, FR05/US05/UC05, FR06/US06/UC07; schema, service tạo phiếu, serializer và test snapshot tương lai. Chỉ chốt chỗ lưu, **không chốt phép cộng tháng DD05/lịch DD06**, không thêm CHECK tính expiry tự động. Miền months vẫn >=0 như BT1, chưa siết 0–120.

## TD-03 — Phân biệt kiểm soát phê duyệt và vòng đời

- **Thay đổi gì:** Thêm approval_status NOT NULL thuộc ba giá trị API và approval_note VARCHAR(1000) NULL; bảo toàn approved_by/approved_at hiện có. CHECK ràng buộc metadata: đã duyệt cần actor/time, chưa duyệt/không cần không có actor/time/note.
- **Vì sao:** API E08/E09/E10/E11 và yêu cầu hỗ trợ ghi chú phê duyệt; BT1 UC05 ngoại lệ tr. 23–24 tạo MOI rồi chờ duyệt. Không biểu diễn duyệt bằng chuyển trạng thái phiếu hay ghi log giả.
- **Ảnh hưởng:** FR06/US06/UC07, NFR02; schema, service/serializer/test tương lai. can_proceed vẫn suy ra, không lưu thêm. **Chưa áp đặt ma trận bảo hành↔phê duyệt phụ thuộc DD02**. Theo DEP-A được duyệt ở lượt điều chỉnh, actor được đối chiếu config và không có FK phụ trợ. Không đổi status/SLA/kết quả bảo hành khi duyệt.

## TD-04 — Index theo truy vấn và log ban đầu

- **Thay đổi gì:** Thêm idx_device_customer(customer_id,device_id); thay idx_ticket_pending_approval bằng idx_ticket_approval_list(center_id,approval_status,received_at,ticket_id) partial theo chưa xác minh/chưa xóa; thêm ID làm thứ tự phụ ở index log/communication; thêm unique partial idx_ticket_initial_log cho log from_status NULL.
- **Vì sao:** E03, E09 và E12 yêu cầu lọc/sort cụ thể, E09 có cả chờ/đã duyệt; QT-06 chỉ có một lần tạo ban đầu. Không thêm index phone trùng UNIQUE.
- **Ảnh hưởng:** FR02/US02/UC02, FR05/US05/UC05, FR06/US06/UC07, FR08/US08/UC06. Có thêm chi phí ghi/index; chưa đo hiệu năng và không tuyên bố NFR01 đạt. Unique chỉ bảo đảm tối đa một log đầu, transaction service vẫn phải tạo log cùng phiếu.

## TD-05 — Ghi rõ sai lệch và phần chưa thực hiện

- **Thay đổi gì:** Tạo ma trận Contract–Schema, kiến trúc/transaction/migration/seed/CRUD, decision log và báo cáo Giai đoạn 1. DDL có cảnh báo chưa là baseline migration cuối.
- **Vì sao:** BT2 Mục 2.5 tr. 5 yêu cầu ghi mọi sai lệch BT1; cần truy vết những khác biệt UC ở BT1 tr. 22/24 so với API/SRS và nguồn/cột còn thiếu.
- **Ảnh hưởng:** Dùng UC theo xác nhận sinh viên (FR06→UC07, FR07→UC11, FR08→UC06); **không sửa** PDF/DBML/drawio/SRS/API. Đường dẫn contract thật trong repo là docs/api-contract-l2.md, khác tên trong kế hoạch; không đổi kế hoạch. Dữ liệu Backend thử nghiệm giữ nguyên.

## TD-06 — Chốt DEP-A và giản lược Backend (lượt điều chỉnh trước)

- **Thay đổi gì:** Sinh viên chính thức chấp thuận DEP-A ngày 2026-10-23: giữ 6 bảng nghiệp vụ lõi trong PostgreSQL, centers/products/accounts/membership bằng config tin cậy; cho phép 1 schema_migration kỹ thuật ở Giai đoạn 2. Đã cập nhật mapping/kiến trúc/decision log/báo cáo và **chỉ comment trong DDL**, không đổi câu lệnh tạo bảng/cột/constraint/index. Không còn DEP-B là hướng thiết kế hiện hành.
- **Vì sao:** Ưu tiên prototype cá nhân nhỏ, đáp ứng nguồn tham chiếu tối thiểu cho E01–E13/QT-14/15/NFR02 mà không tạo module quản trị hoặc bốn bảng phụ trợ. Yêu cầu sinh viên hiện tại là căn cứ phê duyệt DEP; không gán cho giảng viên và không suy thành phê duyệt DD/AUTH/CRUD.
- **Ảnh hưởng:** Không có FK SQL tới config. Service kiểm center/product/actor/quyền; startup kiểm kiểu/ID/membership và tương thích với dữ liệu cũ trước listen; config giữ phiên bản, ID ổn định và bất biến trong process. Sáu bảng vẫn giữ toàn vẹn FK lõi, snapshot, transaction và lịch sử. SQL ngoài ứng dụng có thể bỏ qua kiểm phụ trợ; config lệch phải dừng, không tự chữa dữ liệu. Đề xuất dấu phiên bản/fingerprint trong bảng kỹ thuật duy nhất là thiết kế Giai đoạn 2, chưa tạo hoặc chạy.
- **Giản lược:** Router mỏng kiêm trách nhiệm HTTP; module repository SQL trực tiếp, object config; withTransaction và hàm now truyền vào nơi cần test. Bỏ nhu cầu các lớp reader/adapter/interface/factory cho phụ trợ, không ORM/DI framework. AUTH draft dùng login HTTP+Map session trong bộ nhớ, không bảng; CRUD chỉ bốn PATCH/DELETE đề xuất, bỏ chặn phiếu mở khỏi phương án mặc định. Cả hai vẫn cần duyệt riêng, không có endpoint/code mới.


## TD-07 — Cột và phạm vi hồ sơ đầu vào đã được chấp thuận

- **Thay đổi:** customer.center_id BIGINT NOT NULL CHECK>0; device.product_id BIGINT NOT NULL CHECK>0; device.deleted_at TIMESTAMPTZ NULL. Bỏ DEFAULT12 của device.warranty_months, bắt buộc service cấp tường minh từ product config active.
- **Căn cứ:** DD03/DD07/CRUD được sinh viên duyệt; QT-03/14/15; FR01/02/04/07, US01/02/04/07, UC01/02/04/11. Center/product là ID config DEP-A, không bảng/FK phụ trợ. Giữ sáu bảng và năm FK lõi.
- **Tác động:** customer sở hữu bởi một trung tâm ban đầu do principal server cấp; không chuyển/chia sẻ liên trung tâm. Device không chuyển chủ/product/serial/months qua CRUD. Phone/serial UNIQUE toàn cục kể cả tombstone; không lộ xung đột ngoài scope. ERD gốc chưa có các cột mới cần đồng bộ trong tác vụ sau.

## TD-08 — Bảo hành, SLA và giới hạn dữ liệu cuối

- **Thay đổi:** months của config/device/ticket snapshot thống nhất0–120; issue_desc/content SQL CHECK1–2000 code point sau tập trim ECMAScript. Phụ lục chốt đếm code point, không UTF-16/grapheme, không NFC normalize; reject NUL/surrogate lẻ trước DB.
- **Quyết định:** DD02 cho hết hạn vẫn tạo201, HET_BAO_HANH/KHONG_CAN/can_proceed=true; không suy ra miễn phí. DD05 cộng trực tiếp tháng lịch/clamp, cuối hạn còn, ngày sau hết, 0 tháng chỉ còn trong ngày mua. DD06 24/72/120 giờ thứ Hai–Bảy đủ24h, bỏ Chủ nhật theo Asia/Ho_Chi_Minh; bắt đầu Chủ nhật từ thứ Hai00:00, kết thúc đúng Chủ nhật00:00 dời thứ Hai00:00, không reset khi duyệt.
- **Ràng buộc:** chk_ticket_warranty_approval chỉ cho bốn tổ hợp đã chốt; chk_ticket_assessment_result kiểm so sánh ngày đánh giá/expiry; giữ CHECK snapshot và metadata approval. Thiếu mua vẫn tạo chờ rồi được duyệt, purchase/expiry tiếp tục NULL. Thuật toán tính expiry/SLA ở service, không trigger/CHECK theo ngày hiện tại.
- **Truy vết:** FR02/04/05/06/08, US02/04/05/06/08, UC02/04/05/07/06; QT-04/05/06. Giới hạn0–120 và max2000 là DESIGN kỹ thuật được duyệt, không bịa quy định doanh nghiệp.

## TD-09 — Phụ lục login và hai thực thể CRUD để đáp ứng BT2

- **Thay đổi:** tạo [api-contract-l2-extension.md](api-contract-l2-extension.md), chứa A01 POST /api/auth/login, CU/CD PATCH/DELETE customer, DU/DD PATCH/DELETE device; response/errors/validation/quyền/AC/concurrency và AC bổ sung E04/E05/text. Giữ nguyên13 endpoint và nội dung API Contract v0.1.
- **Vì sao:** BT2 Mục2.1 tr.3/S1 tr.8 yêu cầu hai thực thể CRUD; Mục2.3 tr.4 cần đăng nhập cơ bản. Đây là phần mở rộng được sinh viên chấp thuận, không phải13 endpoint gốc hoặc FR/US mới. Customer create/read dùng E02/E01, Device create/read dùng E04/E03.
- **AUTH:** private scrypt hash/salt, random Bearer TTL3600 giây, session Map digest trong một process, cap100 và cleanup60 giây. Credential thật không vào source/seed/tài liệu; restart/hết hạn401; không bảng account/session/token hoặc API quản trị. Đây là dependency hạ tầng cho NFR02/QT-14.
- **CRUD/history:** NV đúng scope, QL không được ghi. PATCH chỉ tên/địa chỉ customer hoặc ngày mua device. DELETE204 chỉ set target.deleted_at, lặp204 giữ timestamp; không cascade/phone hoặc serial reuse/restore/purge/chặn phiếu mở. Ticket cũ vẫn E09–E13 theo quyền và điều kiện ticket; E11/E13 không bị cấm vì parent ngừng. Snapshot không đổi sau PATCH ngày mua.
- **Đồng thời:** khóa customer→device, precheck/recheck active; PATCH đã thấy active nhưng bị ngừng trước ghi409 RESOURCE_CHANGED, bắt đầu sau ngừng404; PATCH hợp lệ tuần tự, trường gửi sau thắng. E08 chụp trước/sau PATCH nhất quán hoặc từ chối sau DELETE; ticket+log cùng commit/rollback.

## TD-10 — Bỏ fingerprint, giữ config compatibility vừa đủ

- **Thay đổi:** bỏ reference_config_version/reference_config_fingerprint khỏi schema_migration dự kiến. Chỉ bốn trường kỹ thuật version/name/checksum/applied_at; chưa tạo bảng này ở Phase1.
- **Cơ chế thay thế:** config_version/ID ổn định, kiểm trùng/kiểu/membership/credential, đối chiếu ID phụ trợ đã dùng trong DB kể cả tombstone; giữ entry inactive, đóng băng config trong process. Thay đổi ngoại tuyến so bản cũ/mới, tăng version, validate DB rồi restart; không tự cập nhật device/ticket lịch sử.
- **Đánh đổi:** không có FK config và không tự phát hiện người tái sử dụng cùng ID ngoài quy trình. Phải giữ bản config cũ/backup và không đổi nghĩa ID đã dùng. Với prototype local, không có căn cứ bắt buộc thêm fingerprint/bảng quản trị danh mục.

## TD-11 — Hồ sơ hiện hành, phần cần đồng bộ và giới hạn kiểm chứng

- **Đã cập nhật:** DDL, mapping đầy đủ13 E và phụ lục5 endpoint; kiến trúc Minimal Backend, decision log và báo cáo nghiệm thu. Tổng DDL:6 bảng/51 cột/6 PK/5 FK/5 index tường minh. Router/service/repository/config/withTransaction/now đủ trách nhiệm, không thêm framework/ORM/DI hoặc lớp phụ trợ.
- **Ảnh hưởng hồ sơ gốc:** SRS/UC/ERD/DBML/drawio/PDF BT1 cần đồng bộ các cột, CRUD/AUTH/AC và quyền đọc QL ở E10/E12 trước bản nộp tiếp theo. Mã UC theo API: FR06→UC07, FR07→UC11, FR08→UC06. Không sửa các bản gốc trong lượt này; thay đổi đã được ghi tại nhật ký/phụ lục nên không còn quyết định thiết kế ngầm.
- **Kiểm chứng:** kết quả kiểm tĩnh và hash thực tế được ghi tại [phase-01.md](progress/backend/phase-01.md). Chưa chạy DDL trên PostgreSQL, chưa có config/KDF/API/transaction/migration/seed thực thi để báo PASS.
- **Kết luận:** thiết kế Phase1 đủ điều kiện chuyển Phase2 khi sinh viên giao riêng; không tự bắt đầu hiện thực. Không còn câu hỏi phê duyệt lại DD/DEP/AUTH/CRUD đã được xác nhận.

## TD-12 — Hiện thực Backend Foundation theo baseline Phase 1 (2026-10-24)

- **Phạm vi được giao:** thay Backend thử nghiệm bằng Express/TypeScript Foundation, pg pool/transaction, migration/seed, config DEP-A, HTTP login/Bearer/session, authorization/validation/error và test. Không thêm endpoint nghiệp vụ E01–E13 hoặc bốn CRUD trước Phase 3–5.
- **Giữ thiết kế:** docs/schema.sql, API gốc/phụ lục, SRS/ERD/PDF/sơ đồ và Frontend không đổi. Migration 001 sao phần CREATE TABLE của DDL cuối, 002 giữ index và thêm sequence kỹ thuật mã phiếu đã được thiết kế. Sáu bảng nghiệp vụ + một schema_migration, không bảng config/session hoặc trigger mới.
- **Chi tiết TECH:** dùng Node test runner thay vì framework mới; credential local sinh ngẫu nhiên, hash/salt bằng scrypt và file password demo chỉ trong .private bị ignore. PostgreSQL test dùng schema ngẫu nhiên cách ly trong database đã được sinh viên chỉ định; chỉ dọn schema do test vừa tạo, không DROP/reset database/public.
- **Tái lập:** fixture v1 giữ đúng 30 customer/30 device/6 category/200 ticket/200 log/30 communication, snapshot ngày cố định 2026-09-28. Seed lặp không ghi đè dữ liệu vận hành; trường hợp natural key sai quan hệ thì rollback thay vì tự chữa. Không biến seed thành service tính warranty/SLA của Phase 4.
- **Truy vết:** BT2 nền tảng/migration/seed/đăng nhập/test, NFR02 hạ tầng xác thực và QT-13/14/15; các DD đã được sinh viên chấp thuận tại TD-07–TD-10. Không thay 8 FR/US hoặc tự tuyên bố NFR01/NFR03 đạt.
- **Kiểm chứng:** type-check/build, unit/HTTP/PostgreSQL integration, migration/seed chạy lại và compiled startup/login/shutdown thực tế đã đạt. Chi tiết lệnh/số test/phạm vi tệp tại [phase-02.md](progress/backend/phase-02.md). Những thay đổi này là hiện thực thiết kế được giao, không có điều chỉnh quy tắc nghiệp vụ hoặc schema snapshot mới.

## TD-13 — Frontend tối thiểu và đóng gói fullstack Phase 6 (2026-10-25)

- **Thay đổi:** thay trang thử Next rỗng/API wrappers sai bằng ba màn hình tiếp nhận khách/thiết bị, phân loại/tạo phiếu/trao đổi, hàng chờ/phê duyệt; login và API client riêng, token RAM, proxy cùng origin. Wireframe BT1 p1 dự kiến danh sách/search/filter cho NV và mới trước; API E09 hiện hành chỉ QL, CHUA_XAC_MINH và cũ trước. Tách phần nhập của p2 thành hai màn hình, ghép hàng chờ QL với detail/approval p3; không hiện thực danh sách NV/search/status-log endpoint trái contract.
- **Vì sao:** audit phát hiện khoảng thiếu BT2 mục2.3; sinh viên đã cho phép prototype tối thiểu ngay Phase6 và đề xuất đúng ba màn hình này. Ưu tiên quyền/contract đã duyệt; ghi rõ khác wireframe thay vì sửa baseline để hợp thức. Không thêm FR/QT/endpoint/bảng nghiệp vụ.
- **Ảnh hưởng:** src/frontend/**, test client/HTTP+PG/UI, docs kiến trúc/README; FR01–08, UC mapping hiện hành giữ nguyên. PDF/wireframe/API/SRS/ERD gốc không bị sửa. Token refresh mất phiên là giới hạn được ghi nhận.

## TD-14 — Tái lập và lỗi tích hợp Phase 6 (2026-10-25)

- **Thay đổi:** Docker multistage và Compose ba dịch vụ/volume riêng, local/compose host allowlist vẫn khóa tên database; initializer advisory-lock preflight→credential nếu chưa có→migration checksum→seed, health thật; test tổng hợp và clean-room filesystemcopy không Git.
- **Vì sao:** NFR03 fullstack trong SRS mục5.3 và mức Docker nâng cao BT2 mục2.4; không nhầm yêu cầu minimum BT2 với container hóa. Browser test đo đúng click→DOM thay vì chỉ HTTP.
- **Ảnh hưởng:** packaging/config/test/docs, không schema/migration/luật mới; local .env/credential/public không đổi. Khắc phục dependency gián tiếp body-parser2.3→2.4.0 theo advisory GHSA-27r3-jxmh-p828 và chuẩn hóa decoder400 thành error envelope an toàn. Không nâng Express/framework; test gzip hỏng rồi login hợp lệ chứng minh process còn chạy.

## TD-15 — Frontend FE-01: Khung giao diện và route dùng chung (2026-10-25)

- **Thay đổi:** theo yêu cầu triển khai FE-01 của sinh viên, tách monolith thành session provider/guard, app shell, màn hình theo route và các form kế thừa. Bổ sung các route UI `/login`, `/intake`, `/tickets`, `/tickets/[ticketId]`; intake tạm giữ hai bước cũ, chi tiết/phê duyệt/trao đổi có trang riêng. Header/sidebar/responsive dựa trên cấu trúc wireframe đã khảo sát trong kế hoạch frontend. Đây là bố trí frontend kế tiếp TD-13, không thay đổi bản ghi lịch sử của TD-13.
- **Vì sao:** chuẩn bị nền tảng cho bảy giai đoạn frontend, giữ phiên RAM qua điều hướng client và tránh response phiên cũ ảnh hưởng phiên mới. Sinh viên đã giao FE-01 với phương án giữ API hiện có; đây là quyết định thực hiện của sinh viên, không gán phê duyệt giảng viên. Giữ GAP-01–08: E09 chỉ QL/CHUA_XAC_MINH/cũ trước; NV mở ID, không tìm mã/phone hoặc dựng timeline/tên tham chiếu giả.
- **Ảnh hưởng:** frontend source/tests, README/kiến trúc/báo cáo FE-01. FR01–08/US01–08/UC mapping hiện hành giữ nguyên, hạ tầng AUTH hỗ trợ NFR02. API E01–E13/A01, quyền server, SRS, schema, migration, seed/config/credential và dependency giữ nguyên. Chưa làm các cải tiến form/nghiệp vụ FE-02–07; logout chỉ xóa phiên client. Kiểm chứng và các giới hạn tại [phase-01.md](progress/frontend/phase-01.md).

## TD-16 — Frontend FE-02: Hoàn thiện đăng nhập theo A01 (2026-10-25)

- **Thay đổi:** hoàn thiện màn hình login theo giai đoạn được sinh viên giao: validator Unicode, hiện/ẩn mật khẩu, lỗi gần field/focus, trạng thái đang gửi và retry do người dùng bấm. Đây là hoàn thiện màn hình login được đề xuất trong kế hoạch, vì file Figma đã khảo sát không có frame login; không sửa wireframe nguồn.
- **Vì sao:** thực thi A01/AUTH và FE-02, hỗ trợ yêu cầu đăng nhập cơ bản của BT2 Mục2.3. Username trim, password giữ nguyên; giới hạn64/256 theo code point. Tách thông báo sai credential401, lỗi field400, lỗi kết nối và đầy session503; không thêm chính sách auth hoặc FR/US/QT mới.
- **Ảnh hưởng:** login screen, CSS riêng cho login, helper validation và tests/docs/evidence FE-02. Giữ API/client/session/guard FE-01, token RAM, quyền server, backend/schema/config/credential/dependency. Không tự retry, không quản trị account/refresh/revoke hoặc triển khai FE-03. Chi tiết tại [phase-02.md](progress/frontend/phase-02.md).

## TD-17 — Frontend FE-03: Khách hàng và thiết bị cùng màn hình (2026-10-25)

- **Thay đổi:** thực thi FE-03 theo yêu cầu sinh viên: gộp lookup/tạo khách và chọn/tạo thiết bị trong WF02, thay hai vùng form kế thừa tương ứng. Giữ vùng phân loại/tạo phiếu cũ cho FE-04. E03/E05 phân trang theo metadata, serial exact giữ case/số0, raw phone riêng kết quả masked; tháng bảo hành do server trả, ngày mua nullable. Đổi khách/thiết bị xóa lựa chọn và preview cũ; response lookup cũ không ghi đè lựa chọn mới.
- **Vì sao:** hiện thực đặc tả frontend đã lập, FR01/02/07, US01/02/07, UC01/02/11, E01–E05 và DD07/AC thiết bị mới. Validation UX tuân contract, server vẫn kiểm UNIQUE/scope/owner/ngày tương lai;409 chỉ dùng hồ sơ khi API có trả đúng phạm vi. Mất phản hồi POST phải tra GET trước khi ghi thêm, không tự POST lại. Đây là DESIGN/IMPLEMENTATION frontend, không quy tắc nghiệp vụ mới.
- **Ảnh hưởng:** components intake, client/validation/CSS, tests và tài liệu FE-03. Helper backend `src/backend/scripts/ui-test.ts` thêm sản phẩm phân trang và catalog rỗng chỉ trong fixture cách ly; không thêm endpoint, đổi backend production/config/seed/credential/migration/schema/SRS/contract hoặc dependency. Không sửa Figma/PDF nguồn. Chi tiết kiểm chứng và điểm dừng trước FE-04 tại [phase-03.md](progress/frontend/phase-03.md).

## TD-18 — Frontend FE-04: Phân loại, bảo hành và kết quả tạo phiếu (2026-10-25)

- **Thay đổi:** theo yêu cầu sinh viên, thay form intake kế thừa bằng ClassificationForm/WarrantyPreview/TicketReceipt. E06/E07 tải độc lập, mô tả1–2000 code point sau trim, nhóm/ưu tiên không mặc định, summary không tự tính hạn. Sau201 giữ kết quả E08 và khóa draft, cho mở chi tiết hoặc tiếp nhận mới. Hủy nhập có xác nhận, không xóa customer/device đã lưu. Timestamp hiển thị dd/MM/yyyy HH:mm tại Asia/Ho_Chi_Minh, giữ ISO gốc.
- **Vì sao:** thực thi FE-04/WF02, FR02–05/US02–05/UC02–05, E06–E08 và QT-03–06 theo DD02/DD04–06/DD08 đã chốt. Server vẫn tính warranty/SLA/snapshot/trạng thái. Khóa ref+fieldset chống gửi lặp/đổi lựa chọn khi ghi; mạng/timeout/5xx/DTO có thể đã commit thì giữ draft chưa xác định, không tự POST lại. Không thêm idempotency hoặc quy tắc cấm nhiều phiếu cùng thiết bị.
- **Ảnh hưởng:** frontend form/receipt/validation/định dạng thời gian/CSS, tests và docs/evidence FE-04. Helper UI backend truyền clock qua dependency hiện có, điều khiển nhóm sự cố active chỉ trong schema test; không thay auth clock, API/server production/schema/migration/seed/config/credential/dependency. Không sửa PDF/Figma/SRS/contract. Kiểm chứng và giới hạn tại [phase-04.md](progress/frontend/phase-04.md); dừng trước FE-05.

## TD-19 — Frontend FE-05: Danh sách theo quyền và phần đọc chi tiết/lịch sử (2026-10-25)

- **Thay đổi:** theo yêu cầu sinh viên sau rà soát FE-04, hoàn thiện E09 cho QL với meta/sort server, URL filter/page hợp lệ, tự về trang hợp lệ và empty đối chiếu filter khác qua size1. NV chỉ mở ID an toàn. E10 hiển thị hai cột, ba loại trạng thái tách riêng, snapshot/phone từ response và fallback ID. E12 phân trang/retry độc lập; đổi ID dọn dữ liệu/draft cũ, không dựng timeline hoặc tên tham chiếu giả.
- **Vì sao:** thực thi WF01/WF03, FR06/08, US06/08, UC07/06, QT-14/15 và E09/E10/E12 theo baseline. E09 summary không có tên/priority/description thì không kéo E10 từng hàng. Lỗi E12 không làm mất E10; snapshot không thay theo device hiện tại. Đây là hiện thực frontend, không thay quyền, luật bảo hành/SLA hoặc contract.
- **Ảnh hưởng:** components tickets, màn hình/route liên quan, query helper/nhãn/CSS/client size E09, tests/docs/evidence FE-05. Tách form ghi/phê duyệt cũ sang legacy/ticket-actions.tsx, giữ logic ghi hiện có và dừng trước hoàn thiện FE-06. Toàn bộ backend kể cả helper UI, schema/migration/config/seed/credential/dependency và nguồn giữ nguyên. Chi tiết kiểm chứng tại [phase-05.md](progress/frontend/phase-05.md).

## TD-20 — Frontend FE-06: Hoàn thiện ghi trao đổi và phê duyệt (2026-10-25)

- **Thay đổi:** sinh viên giao FE-06 sau rà soát FE-05. Thay form ghi kế thừa bằng CommunicationForm/ApprovalForm, validation code point, lỗi field/focus và ref chặn submit lặp. E13 xác nhận201, xóa draft đã lưu, hiện ID/time/actor từ server và đọc trang cuối; GET lỗi vẫn giữ xác nhận. E11 dùng200 cập nhật approval, đọc lại detail;409/timeout đối chiếu GET, không ghi đè metadata đầu. Không tự retry POST, không suy kết quả E13 bằng content trùng.
- **Vì sao:** thực thi FR06/08, US06/08, UC07/06, E11/E13, QT-05/14 và NFR02 theo contract/SRS. Note tùy chọn tối đa1000 sau trim/null, content1–2000; server giữ quyền/actor/time và luật phê duyệt. Hai controller đọc E10/E12 riêng giữ dữ liệu đã xác nhận và tìm trang cuối theo meta; thay ID/phiên loại response cũ. Không thay snapshot/SLA/lifecycle khi duyệt hoặc ghi trao đổi.
- **Ảnh hưởng:** forms/hooks/validation/CSS/tests/docs/evidence FE-06; bỏ legacy/ticket-actions.tsx. Helper UI backend thêm điều khiển file cho một ticket fixture chuyển MOI→DA_PHAN_CONG kèm status log trong transaction để kiểm409 không còn áp dụng; chỉ schema test, không endpoint/module phân công. Không sửa backend production/API/SRS/schema/migration/config/seed/credential/dependency hoặc tài liệu nguồn. Kết quả và giới hạn tại [phase-06.md](progress/frontend/phase-06.md); dừng trước FE-07.

## TD-21 — Frontend FE-07: Hoàn thiện bố cục và bàn giao (2026-10-25)

- **Thay đổi:** theo yêu cầu sinh viên sau rà FE-06, tách vùng03 phân loại và04 kiểm tra/tạo của WF02: ba cột từ1280px, hai cột768–1279px, một cột nhỏ hơn768px. Giữ một form/fieldset và state ghi; nhóm input/nút tra cứu xếp dọc dưới1280px sau khi QA phát hiện input tablet hẹp. Chuyển form trao đổi NV xuống dưới lịch sử, thêm gợi ý/focus bảng cuộn, border lỗi cho textarea/select.
- **Vì sao:** hoàn thành FE-07, đối chiếu lại ba frame Figma qua Console live; FR01–08/khả dụng và NFR01–03 theo kế hoạch đã lập. Đây là DESIGN/IMPLEMENTATION trình bày và kiểm chứng, không đổi quy tắc QT hoặc baseline nghiệp vụ. GAP-01–10 tiếp tục đúng API; không dựng tên/search/timeline/SLA chưa có.
- **Ảnh hưởng:** frontend markup/CSS, bốn test polish và output evidence mới, helper smoke UI Compose, tài liệu bàn giao/dự thảo AI riêng. Hồi quy94/95/45/53 local và container, NFR01 100/100, NFR02 9/9, Compose/restart/UI đạt. Toàn bộ backend kể cả helper UI, API/SRS/schema/migration/seed/config/credential cũ/dependency/packaging và nguồn giữ nguyên; test Compose dùng volume/credential mới riêng. Không sửa disclosure hiện có hoặc dùng Git. Chi tiết tại [phase-07.md](progress/frontend/phase-07.md); kết thúc lộ trình FE-01–07.

## TD-22 — Chuyển trung tâm bảo hành từ config sang PostgreSQL (2026-10-25)

- **Thay đổi:** sinh viên yêu cầu lưu trung tâm vào PostgreSQL, xác nhận chuyển hai trung tâm hiện có trước. Thêm service_center(center_id,center_name,is_active); migration003 chuyển ID1/2/tên/trạng thái, FK customer/ticket ON DELETE RESTRICT. JSON reference version2 bỏ centers, repository DB là nguồn trung tâm; product/account/membership vẫn config.
- **Vì sao:** đưa danh mục dependency L2 về PostgreSQL theo yêu cầu bổ sung và hướng dẫn dataset SE. Thay phần center của DEP-A, giữ sáu bảng lõi và thêm một danh mục; FR01/05/06/QT-14 liên quan, không luật mới. Chưa nhập CSV, không mở phân công/kho hoặc API quản trị trung tâm.
- **Ảnh hưởng:** reference loader/foundation/auth/CLI/Compose startup/seed/E08, repository/migration/tests và tài liệu. Auth kiểm DB lúc login/request; E08 giữ SHARE center trong transaction.001/002, dữ liệu/snapshot/SLA/lịch sử/sequence, credential/API/frontend giữ nguyên. Báo cáo và minh chứng tại [service-centers-postgresql.md](progress/backend/service-centers-postgresql.md).

## TD-23 — CSV-03: email nullable và importer cách ly (2026-10-26)

- **Căn cứ:** sinh viên chọn lưu email nullable, dùng trung tâm SQL với phân bổ mô phỏng và giao CSV-03 theo [kế hoạch](plans/customer-device-csv-import-plan.md). Dependency FR01/02/04/07, QT-01/02/03/05/14/15; không thêm FR/QT hoặc module.
- **Schema đích:** migration004 ADD customer.email TEXT NULL, không UNIQUE/default/backfill; đồng bộ DDL, không sửa001–003. Chưa apply public, chỉ kiểm sạch/upgrade/lặp trong schema test.
- **Tương thích:** startup chỉ cho phép004 pending sau003, vẫn kiểm registry/checksum và từ chối thiếu migration khác. CRUD/DTO cũ không cần email; importer yêu cầu email/catalog đúng trước ghi. Public003 vẫn qua bootstrap foundation.
- **Importer:** CLI → service → repository → PostgreSQL; ReceiptStore private ghi journal trước COMMIT/receipt sau COMMIT, đối chiếu trạng thái transaction nếu kết quả chưa rõ. Không bảng ledger hoặc endpoint mới. Chỉ reuse có provenance, giữ mutable edits/tombstones và owner/product/serial bất biến. CLI public apply bị chặn ở CSV-03.
- **Tái lập:** thêm replay/snapshot chỉ đọc/chuẩn hóa có tham số trong scripts/dataset; bản catalog v3 và dữ liệu vẫn private. Source/manifest CSV-02/catalog v2/tài khoản/credential không đổi; không sửa disclosure.
- **Kiểm chứng:**108 unit/HTTP,118 PG runner tests, typecheck/build và bộ thật pilot→full→rerun trong schema riêng đã dọn; public8 bảng/sequence/config/credential giữ nguyên. [CSV-03](progress/data-import/csv-03.md) ghi kết quả/giới hạn.

## TD-24 — CSV-05: áp dụng dữ liệu khách hàng/thiết bị trên Windows (2026-10-26)

- **Căn cứ:** sinh viên giao CSV-05 sau CSV-04; giữ policy/email nullable/seed và mapping đã chốt. FR01/02/04/05/06/07, QT-01/02/03/04/05/14/15 liên quan; không FR/QT mới hoặc đổi contract.
- **Áp dụng:** public Windows migrate004, catalog3 bổ sung320 sản phẩm giữ101–104/accounts/membership; nạp51.275 khách/7.414 device theo pilot→full→rerun. Ngày mua NULL, email nội bộ, center1/2 mô phỏng seed20261026; không lịch sử phiếu hoặc module khác.
- **Guard:** public CLI cần schema/database xác nhận rõ, source hash, state-dir tuyệt đối và fingerprint mới; không nhận catalog riêng. Transaction/journal/receipt/constraints giữ nguyên; không tự reuse natural keys thiếu provenance.
- **Bảo toàn/tái lập:** backup trước/sau phục hồi thử schema riêng và dọn; giữ cột cũ/IDs/snapshot/log/credential. Fixture catalog demo riêng giữ assertion hồi quy; smoke production chỉ đọc public. Docker không nạp, source/manifest/Frontend/API/migration cũ/disclosure không sửa.
- **Kiểm chứng:**109 unit/HTTP +118 PG runner +45 client +53 browser PASS;6/6 live ở pilot và6/6 full, rerun0 insert. [CSV-05](progress/data-import/csv-05.md) và [bàn giao](../src/backend/docs/customer-device-import-operations.md) ghi backup/receipt/giới hạn.
