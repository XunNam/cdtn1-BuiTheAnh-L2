# KẾ HOẠCH TRIỂN KHAI BACKEND L2 — CĐTN1

> **Loại tài liệu:** Kế hoạch điều phối và kiểm chứng cho Codex (không phải API Contract, SRS hoặc tài liệu nộp thay sinh viên).  
> **Phiên bản:** 1.0 · **Trạng thái:** Được đề xuất, chờ triển khai từng giai đoạn.  
> **Vị trí đề xuất trong repo:** `docs/plans/backend-l2-implementation-plan.md`  
> **Repository:** `D:\Đồ án\CĐTN1\cdtn1-BuiTheAnh-L2\`  
> **Phạm vi:** Backend REST API cho L2 — Tiếp nhận và phân loại yêu cầu bảo hành (Smart CRM — Mekong Mobile).  
> **Stack:** Node.js, Express, TypeScript, PostgreSQL.

## 1. Mục đích và cách sử dụng

Đây là **nguồn kế hoạch thống nhất** để Codex không mất ngữ cảnh giữa các lần làm việc. Mỗi lần được yêu cầu thực hiện một giai đoạn, Codex phải đọc lại tài liệu này cùng `AGENTS.md`, API Contract, các tài liệu nguồn liên quan và báo cáo giai đoạn gần nhất.

**Kế hoạch không tự cấp quyền thực thi.** Codex chỉ thực hiện giai đoạn được sinh viên yêu cầu rõ ràng; không tự chuyển giai đoạn, không tự chốt thay sinh viên quyết định nghiệp vụ còn mở. Nếu thay đổi kế hoạch, phải nêu thay đổi, căn cứ và xin chấp thuận trước khi sửa chính tệp này.

Kế hoạch quản lý công việc; **`docs/API_Contract_L2.md` quản lý giao diện API**, SRS/hồ sơ BT1 mới nhất quản lý yêu cầu đã chốt, Case Study quản lý quy tắc nghiệp vụ và đề BT2 quản lý tiêu chí đánh giá. Không sử dụng kế hoạch này để lấn át các nguồn đó.

## 2. Baseline, nguồn và các quyết định đã xác nhận

- **Baseline:** SRS/hồ sơ BT1 mới nhất với **8 FR/US**; phiếu phạm vi ban đầu đã lỗi thời và chỉ còn giá trị lịch sử.
- **API Contract:** 13 endpoint **E01–E13** trong `docs/API_Contract_L2.md`; không sửa contract theo suy đoán.
- **Mã Use Case:** **UC07 = phê duyệt bảo hành**, **UC06 = trao đổi**, ưu tiên cách đánh mã trong API Contract. Việc đồng bộ tài liệu UC gốc sẽ thực hiện riêng sau.
- **Nguồn nghiệp vụ:** Case Study Mekong Mobile, nhất là quy trình L2, dữ liệu, trạng thái và Mục 9/Bảng 9.1. Phân biệt quy tắc **thuộc L2** và dependency **ảnh hưởng tới L2**.
- **Nguồn kỹ thuật:** kiến trúc/ERD/SQL DDL trong BT1, tài liệu SE Buổi 5–9, đề BT2; ví dụ ở slide không đương nhiên là phạm vi đã duyệt.
- **Hiện trạng mã:** Backend/Frontend trước đây chỉ là code thử nghiệm. Có thể thay thế **mã Backend** nếu cần; không phải giữ router mẫu hoặc `store.ts` dùng mảng.
- **Git:** Codex **không chạy lệnh Git**, không commit, push, checkout, tạo nhánh hoặc tag. Sinh viên tự thực hiện.

## 3. Phạm vi sửa tệp và điều kiện quyền ghi

**Được sửa khi giai đoạn tương ứng được giao:**

- `src/backend/**` (mã, package, lockfile, migration, seed, test, `.env.example`, README Backend).
- `docs/schema.sql` và `docs/thay-doi-thiet-ke.md` khi cần đối chiếu contract; phải ghi lý do và tác động.
- `tests/**`, `data/**` **chỉ** với các tệp do Backend sử dụng và không đè dữ liệu/tài liệu nguồn có sẵn.
- `docs/progress/backend/**` (báo cáo từng giai đoạn, nhật ký quyết định).

**Chỉ đọc, không chỉnh sửa:** `sources/**`, `ref/**`, `src/frontend/**`, `docs/API_Contract_L2.md`, hồ sơ BT1/PDF/sơ đồ gốc, `docs/ai-disclosure.md`, `.git/**` và các tệp ngoài phạm vi giai đoạn. Có thể **đề xuất** nội dung khai báo AI, không tự ghi là sinh viên đã kiểm chứng.

Trước lần chỉnh sửa đầu tiên, kiểm tra quyền ghi qua cơ chế workspace/permissions chính thức của Codex. **Đọc được file không có nghĩa là được ghi.** Nếu thư mục ổ D chưa nằm trong vùng ghi, dừng và thông báo cách cấp quyền chính thức; không vượt sandbox, không ghi thử ra ngoài vùng được cấp quyền. Không cần dùng Git để kiểm tra.

## 4. Nguyên tắc kiến trúc và bất biến nghiệp vụ

**Luồng phụ thuộc:** `Routes/Controllers → Services → Repositories → PostgreSQL`.

- Controller/route: HTTP, request, response; không chứa SQL hoặc quy tắc nghiệp vụ.
- Service: quy trình, QT-xx, transaction, kiểm soát trạng thái; không phụ thuộc `req`/`res`.
- Repository: truy cập dữ liệu, truy vấn tham số hóa; không tự quyết định nghiệp vụ.
- Validator/middleware: kiểu dữ liệu, trường bắt buộc, trường lạ, xác thực, phân quyền.
- Phản hồi theo API Contract: thành công `{data: ...}`; lỗi `{error: {code, message, fields}}`; tên trường `snake_case`; bảo vệ thông tin nhạy cảm.
- PostgreSQL là nguồn lưu trữ nghiệp vụ; dùng PK/FK/UNIQUE/CHECK/INDEX thích hợp, migration và seed tái lập được.
- Mọi endpoint kiểm tra Bearer token và quyền ở **server** theo contract; không dùng token cố định không kiểm chứng như đường tắt.

**Các bất biến cần bảo toàn trong tất cả giai đoạn:**

1. Chuẩn hóa phone, ràng buộc duy nhất và che số điện thoại theo quyền (QT-01/02/15).
2. Serial/IMEI duy nhất; không tự đổi chủ thiết bị (QT-03).
3. SLA theo QT-04 và quyết định lịch đã chốt; không tự thêm giờ hành chính.
4. Thiếu ngày mua có thể tạo phiếu `MOI`, đánh dấu chưa xác minh, `can_proceed=false` theo contract; không tự chuyển thành từ chối.
5. Tạo `ticket` và log trạng thái `NULL → MOI` **cùng transaction** (QT-06).
6. Phê duyệt chỉ khi đủ điều kiện và đúng quyền; không tự đổi trạng thái phiếu, không tự biến kết quả bảo hành thành "còn bảo hành", không tính lại SLA.
7. Hai yêu cầu phê duyệt đồng thời không được cùng thành công; yêu cầu thua phải nhận xung đột phù hợp.
8. Ghi trao đổi không đồng nghĩa gửi SMS/Zalo/email và không đổi trạng thái hoặc SLA.
9. Không tự bổ sung chức năng phân công kỹ thuật viên, sửa chữa, linh kiện, thu phí hay vòng đời CRM khác.
10. Không tự áp dụng điều kiện "thiết bị đã có phiếu chưa đóng thì chặn" từ ví dụ minh họa nếu contract không quy định.

## 5. Tổng quan 6 giai đoạn

| Giai đoạn | Phạm vi | Endpoint | Cổng hoàn thành |
|---|---|---|---|
| **1 — Kiến trúc & CSDL** | Contract ↔ schema, dependency, quyết định mở, CRUD | Rà E01–E13 | Không thiếu nguồn dữ liệu/cột bắt buộc; quyết định chặn schema đã chốt |
| **2 — Foundation & Auth** | Express, DB, migration/seed, lỗi, validation, token/quyền, test | Nền tảng | Chạy được với PostgreSQL, test nền tảng và seed tái lập |
| **3 — Customer & Device** | Khách hàng và thiết bị | E01–E04 | Contract test, DB constraints, quyền và trường hợp trùng đạt |
| **4 — Warranty & Ticket** | Danh mục, preview bảo hành, tạo phiếu/SLA | E05–E08 | Transaction, snapshot, lịch SLA và ngoại lệ đạt |
| **5 — Approval & Communication** | Danh sách/chi tiết, phê duyệt, trao đổi | E09–E13 | Quyền, đồng thời và bất biến trạng thái đạt |
| **6 — Verification & BT2** | Test tích hợp, CRUD, NFR, README, Docker/Compose Backend+DB | E01–E13 | Có minh chứng chạy thực tế và ghi rõ phần Fullstack chưa đạt |

## 6. Giai đoạn 1 — Kiến trúc, schema và quyết định nền tảng

**Mục tiêu:** Đủ căn cứ để viết migration đúng ngay từ đầu, không phải thay schema tùy tiện sau khi code endpoint.

**Đầu vào:** `docs/API_Contract_L2.md`, `docs/schema.sql`, SRS/AC/NFR mới nhất, ERD/BT1, Case Study Bảng 9.1, đề BT2 và mã Backend thử nghiệm.

**Công việc:**

1. Lập ma trận **E01–E13 → request/response → bảng/cột nguồn → lưu/suy ra/snapshot → QT/FR/US/UC → kiểm thử**.
2. Xác định và giải quyết các khoảng trống đã phát hiện: `customer.address`, liên kết phạm vi trung tâm, `device.product_id`, snapshot bảo hành của phiếu, ghi chú/người/thời điểm phê duyệt, nguồn dữ liệu tài khoản/trung tâm/sản phẩm.
3. Phân biệt **6 bảng nghiệp vụ lõi** với bảng/config/seed phụ trợ; không tự tăng số bảng để mô phỏng toàn hệ thống. Giải thích mỗi dependency và ảnh hưởng đến yêu cầu 4–6 bảng trước khi thêm.
4. Chốt PK/FK, UNIQUE (phone, serial, mã phiếu), CHECK, index và ràng buộc ownership.
5. Thiết kế transaction tạo phiếu + log; cập nhật phê duyệt có điều kiện; xử lý xung đột đồng thời tại DB.
6. Chọn chiến lược migration có lưu phiên bản, seed khóa ổn định, không nhân đôi bản ghi/không ghi đè dữ liệu vận hành.
7. **Giải quyết yêu cầu BT2 có ít nhất hai thực thể CRUD ngay ở giai đoạn này:** nêu hai thực thể dự kiến, thao tác nào đã có/thiếu, chính sách soft delete (QT-13), phương án bổ sung tối thiểu và tác động lên contract. **Không tự thêm endpoint khi chưa được sinh viên phê duyệt.**
8. Rà DD03, mô hình dependency và những quyết định liên quan schema; ghi vào nhật ký quyết định trạng thái "Đã chốt" hoặc "Cần chốt".
9. Sau khi các quyết định ảnh hưởng schema được chốt, cập nhật `docs/schema.sql` và ghi thay đổi trong `docs/thay-doi-thiet-ke.md`. Không sửa ERD gốc hoặc API Contract.

**File dự kiến:** `docs/schema.sql`, `docs/thay-doi-thiet-ke.md`, tài liệu mapping trong `src/backend/docs/` (nếu thực sự cần), báo cáo giai đoạn 1.

**Kiểm chứng/cổng chuyển giai đoạn:** Mỗi field bắt buộc của 13 endpoint có nguồn nhất quán; schema rõ FK/constraint/index; không có quyết định còn mở ảnh hưởng việc tạo migration; phương án CRUD đã được ghi nhận và phần cần phê duyệt được tách riêng. Đây chủ yếu là **kiểm chứng thiết kế**, chưa tuyên bố migration đã chạy.

## 7. Giai đoạn 2 — Backend Foundation, PostgreSQL và xác thực

**Đầu vào:** Schema/ma trận mapping và các quyết định nền tảng đã chốt; kiểm tra runtime Node/PostgreSQL và package manager thực tế.

**Công việc:**

1. Thay mã Backend thử nghiệm cần thiết; tách `app.ts`/`server.ts` để kiểm thử HTTP không cần chạy cổng thật.
2. Tổ chức routes/controllers/services/repositories, validators, middleware, config, DB pool, transaction và error handler; loại `store.ts` khỏi lưu trữ nghiệp vụ.
3. Chuẩn hóa JSON request/response, ID số nguyên an toàn, trường lạ, query lặp, phân trang, ngày, mã lỗi 400/401/403/404/409/415/500 theo contract.
4. Tạo migration runner dùng DB thực, lưu phiên bản; seed danh mục, trung tâm, sản phẩm và tài khoản demo **idempotent**.
5. Chốt phương án cấp token: ưu tiên xác thực tài khoản demo, mật khẩu băm, token ngẫu nhiên có hạn và kiểm chứng server-side; cách cấp token qua CLI/local hay endpoint HTTP là **quyết định cần sinh viên phê duyệt** vì API Contract chưa đặc tả endpoint đăng nhập.
6. Middleware xác định principal, vai trò và phạm vi trung tâm; 401 với token không hợp lệ, 403 khi thiếu quyền, 404 khi tài nguyên ngoài phạm vi theo contract.
7. Logging tối thiểu, không lộ token, mật khẩu, số điện thoại đầy đủ hoặc stack trace trong response.
8. Thiết lập type-check, test runner và các test nền tảng.

**File dự kiến:** chỉ trong `src/backend/**`, ngoài báo cáo tiến độ và thay đổi thiết kế đã cho phép.

**Kiểm chứng/cổng chuyển giai đoạn:** Backend khởi động và kết nối PostgreSQL; migration chạy từ DB trống; seed chạy hai lần không nhân đôi; test authentication/validation/error handler chạy thật; không còn mảng dữ liệu làm nguồn nghiệp vụ. Nếu chưa có PostgreSQL khả dụng, ghi `BLOCKED`, không báo PASS.

## 8. Giai đoạn 3 — Customer & Device (E01–E04)

**Đầu vào:** Foundation, schema, seed, nguồn sản phẩm tin cậy và DD07 đã được chốt.

- **E01 `GET /api/customers?phone=...`:** chuẩn hóa phone, trả đúng một khách, áp dụng quyền và che thông tin.
- **E02 `POST /api/customers`:** tạo khách, tên/phone/address theo contract; trùng phone trả `409`, hồ sơ cũ chỉ trả khi thuộc quyền.
- **E03 `GET /api/customers/{customer_id}/devices`:** danh sách thiết bị theo khách, lọc serial chính xác và phân trang.
- **E04 `POST /api/customers/{customer_id}/devices`:** tạo thiết bị đúng chủ/sản phẩm, ngày mua hợp lệ; serial trùng không đổi chủ.

Tách serializer hợp đồng khỏi database row; không điều chỉnh response để chạy theo Frontend thử nghiệm. Rà AC cho thiết bị mới (DD07) trước khi viết E04. Nếu phương án CRUD bổ sung đã được duyệt cho những thực thể này, triển khai đúng phạm vi và bổ sung test, đồng thời ghi nhật ký thay đổi thiết kế và **đề xuất** cập nhật contract riêng; không tự sửa tệp API Contract.

**Kiểm chứng/cổng chuyển giai đoạn:** Các endpoint E01–E04 đạt request/response/status/quyền; test phone biến thể, giới hạn tên, serial trùng, ngày mua tương lai, sai chủ, ngoài trung tâm và request đồng thời tạo trùng; dữ liệu lưu bền vững trong PostgreSQL.

## 9. Giai đoạn 4 — Product, Category, Warranty và Ticket (E05–E08)

**Đầu vào:** E01–E04; dữ liệu sản phẩm/danh mục; quyết định DD02/05/06 đã chốt.

- **E05 `GET /api/products`:** trả sản phẩm và chính sách bảo hành từ nguồn đáng tin.
- **E06 `GET /api/issue-categories`:** trả danh mục sự cố hợp lệ.
- **E07 `GET /api/devices/{device_id}/warranty`:** preview bảo hành; thiếu ngày mua/hết hạn là kết quả nghiệp vụ `200`, không tự chuyển thành lỗi HTTP. Dùng đồng hồ server kiểm thử được.
- **E08 `POST /api/tickets`:** xác minh khách/thiết bị/chủ/trung tâm/nhóm lỗi/ưu tiên; tính SLA theo QT-04; lưu snapshot; server sinh mã, thời điểm và trạng thái `MOI`; **tạo ticket + log `NULL → MOI` trong cùng transaction**.

**Không tự suy luận:** một tháng = 30 ngày, SLA theo giờ hành chính, thời điểm/bảo hành gửi từ client đáng tin, hoặc chính sách thiết bị hết hạn khác contract. Sinh mã phiếu phải chịu được đồng thời, không dùng `COUNT(*) + 1`.

**Kiểm chứng/cổng chuyển giai đoạn:** Test ngày cuối bảo hành/ngày kế tiếp, cuối tháng/năm nhuận, SLA qua Chủ nhật, thiếu ngày mua, priority/category sai, rollback nếu ghi log lỗi, snapshot không đổi khi dữ liệu thiết bị thay đổi về sau.

## 10. Giai đoạn 5 — Approval & Communication (E09–E13)

**Đầu vào:** Ticket thật của giai đoạn 4, token/principal, phạm vi trung tâm và NFR02.

- **E09 `GET /api/tickets`:** quản lý xem phiếu theo `approval_status`; lọc quyền **trước** phân trang.
- **E10 `GET /api/tickets/{ticket_id}`:** chi tiết phiếu từ snapshot, che phone theo vai trò.
- **E11 `POST /api/tickets/{ticket_id}/warranty-approval`:** chỉ quản lý đủ quyền được phê duyệt phiếu đúng trạng thái/điều kiện; cập nhật có điều kiện trong transaction; không chuyển `MOI`, không tính lại SLA.
- **E12 `GET /api/tickets/{ticket_id}/communications`:** đọc trao đổi theo thời điểm, có thứ tự phụ bằng ID.
- **E13 `POST /api/tickets/{ticket_id}/communications`:** ghi nội dung và actor/time ở server; không gửi thông báo ngoài hệ thống.

**Kiểm chứng/cổng chuyển giai đoạn:** NV/không token/ngoài trung tâm bị từ chối đúng; hai yêu cầu duyệt đồng thời chỉ một thành công, yêu cầu còn lại `409`; lỗi không ghi đè actor/time; phê duyệt và trao đổi không làm biến đổi sai SLA/status; E09–E13 đạt contract.

## 11. Giai đoạn 6 — Verification, Docker/Compose và độ sẵn sàng BT2

**Đầu vào:** E01–E13 và test/seed/migration của các giai đoạn trước.

1. Chạy test tích hợp theo contract cho đủ endpoint, bao phủ happy path, dữ liệu sai, biên, quyền, đồng thời, rollback, bất biến dữ liệu.
2. Dựng PostgreSQL sạch, chạy migration/seed và chạy lại; đối chiếu số bản ghi, dữ liệu và logs.
3. **Xác nhận (không chỉ nêu khoảng trống) tiêu chí hai thực thể CRUD** của đề BT2. Nếu phương án bổ sung chưa được phê duyệt, ghi `BLOCKED`/`CHƯA ĐẠT`, không tự tuyên bố đáp ứng.
4. Kiểm chứng NFR02 (phê duyệt trái quyền bị từ chối). Đo phần API liên quan NFR01 nhưng **không suy ra** thời gian hiển thị UI từ thời gian server.
5. Tạo cấu hình Docker/Compose tối giản cho **Backend + PostgreSQL**, chạy thử thực tế và ghi lệnh/điều kiện trong README Backend. NFR03 của **toàn bộ prototype** chỉ được kết luận khi Frontend cũng được tích hợp và kiểm chứng tối đa hai lệnh theo yêu cầu riêng.
6. Hoàn thiện `src/backend/README.md`: yêu cầu môi trường, biến env, cài, migrate, seed, run, test và troubleshooting.
7. Đề xuất khai báo AI theo công cụ/phạm vi/tệp/cách sinh viên kiểm chứng; không tự khẳng định kiểm chứng chưa thực hiện.
8. Liệt kê rõ các mục BT2 còn thuộc Frontend hoặc tài liệu tổng hợp, không xem Backend hoàn thành là toàn bài hoàn thành.

**Kiểm chứng/cổng hoàn thành:** Có bằng chứng chạy thật của migration/seed/test/Docker; endpoint-contract matrix đã kiểm tra; không còn lỗi blocker nghiệp vụ hoặc quyền; những giới hạn còn lại được nêu minh bạch.

## 12. Nhật ký quyết định phải được chốt có kiểm soát

Trước phần triển khai phụ thuộc, Codex phải lập bảng **mã quyết định – căn cứ – lựa chọn đề xuất – tác động – trạng thái – người duyệt** trong `docs/progress/backend/decision-log.md` (khi được giao Giai đoạn 1). Không tự đánh dấu "Đã duyệt" nếu sinh viên chưa xác nhận.

| Mã | Quyết định cần xử lý | Chặn bước nào |
|---|---|---|
| DD03 | Phạm vi khách hàng theo trung tâm và QT-14 | Chốt schema |
| DEP | Nguồn dữ liệu account, center, product và số bảng phụ trợ tối thiểu | Chốt schema/migration |
| CRUD | Hai thực thể có đầy đủ CRUD, xử lý soft delete và tác động API Contract | Chốt phạm vi; trước triển khai endpoint bổ sung |
| AUTH | Phương án cấp token local/HTTP, lưu và kiểm chứng token | Foundation |
| DD07 | Ghi thiết bị mới, AC và nguồn product | E04 |
| DD02 | Xử lý thiết bị hết bảo hành theo contract | E08 |
| DD05 | Cộng tháng bảo hành theo lịch, quy tắc biên | E07 |
| DD06 | SLA bỏ Chủ nhật, xử lý ranh giới 00:00 | E08 |

Nếu người dùng đã chốt một mục trong các lần trao đổi sau, cập nhật log kèm ngày, quyết định và căn cứ; không hỏi lại vô ích.

## 13. Quy tắc thực hiện mỗi giai đoạn

Mỗi lần nhận yêu cầu `Thực hiện Giai đoạn N`:

1. Đọc `AGENTS.md`, **tài liệu kế hoạch này**, `docs/API_Contract_L2.md`, các tài liệu nguồn liên quan, `docs/progress/backend/decision-log.md` (nếu có) và báo cáo giai đoạn trước (nếu có).
2. Kiểm tra vùng workspace được phép ghi. Nếu không có quyền, báo blocker và dừng; không vượt sandbox.
3. Nhắc lại ngắn phạm vi giai đoạn, đầu vào đã có, quyết định còn chặn và tiêu chí hoàn thành.
4. Chỉ sửa các tệp được phép, trong giai đoạn được giao. Không chạy Git, không sửa Frontend hay contract.
5. Tạo test và chạy kiểm chứng có thể thực hiện; không thay test để che lỗi.
6. Cập nhật `docs/thay-doi-thiet-ke.md` khi thực sự thay đổi thiết kế BT1.
7. **Tạo/cập nhật báo cáo giai đoạn** theo Mục 14 với kết quả thực tế.
8. Dừng sau khi báo cáo; **không tự chuyển sang giai đoạn kế tiếp**. Nếu bị chặn, ghi lý do và hành động cần thiết, không đánh dấu hoàn thành.

Không làm một giai đoạn lớn một cách mù quáng: có thể chia thành các tác vụ con trong giai đoạn và kiểm thử tuần tự. Các quyết định nghiệp vụ chưa được chốt phải được trình bày cho sinh viên trước khi phần code phụ thuộc được hiện thực.

## 14. Báo cáo sau mỗi giai đoạn — bắt buộc trong quy trình dự án

**Nên có một file Markdown cho mỗi giai đoạn**; đây là hồ sơ quản lý tiến độ và kiểm chứng **do dự án tự chọn**, không mặc nhiên là một thành phần nộp riêng do học phần yêu cầu:

- `docs/progress/backend/phase-01.md`
- `docs/progress/backend/phase-02.md`
- `docs/progress/backend/phase-03.md`
- `docs/progress/backend/phase-04.md`
- `docs/progress/backend/phase-05.md`
- `docs/progress/backend/phase-06.md`

Codex tạo file khi **bắt đầu thực hiện giai đoạn tương ứng**, sau đó cập nhật ở cuối mỗi lượt thực hiện; không tạo trước báo cáo PASS giả. Sử dụng mẫu:

### Mẫu báo cáo (sao chép nội dung bên dưới cho mỗi file)

**Giai đoạn:** N — [Tên]  
**Ngày cập nhật:** YYYY-MM-DD  
**Trạng thái:** `CHƯA BẮT ĐẦU` / `ĐANG LÀM` / `BLOCKED` / `HOÀN THÀNH`  
**Mục tiêu và phạm vi:** [đúng với kế hoạch]  
**Nguồn đã đối chiếu:** [tên file, mục/bảng/QT, FR/US/UC/NFR]  
**Quyết định đã chốt:** [mã, người xác nhận, thời điểm]  
**File tạo/sửa/xóa:** [đường dẫn + tóm tắt]  
**Thiết kế thay đổi:** [mã TD-xx hoặc "Không"]  
**Test và lệnh đã chạy:** [lệnh thực tế, số PASS/FAIL, môi trường]  
**Test chưa chạy / bị chặn:** [lý do rõ ràng]  
**Kết quả theo tiêu chí hoàn thành:** [từng tiêu chí: PASS / FAIL / NOT RUN / BLOCKED]  
**Vấn đề còn tồn tại:** [độ ưu tiên, tác động]  
**Nội dung gợi ý khai báo AI:** [công cụ, việc hỗ trợ, file, phương thức kiểm chứng thực tế]  
**Điều kiện chuyển giai đoạn:** [đạt/chưa đạt; cần sinh viên quyết định gì]  
**Ghi chú:** Codex không thực hiện Git, không tự chuyển giai đoạn.

Một giai đoạn chỉ được ghi `HOÀN THÀNH` nếu **các tiêu chí bắt buộc đã được kiểm chứng**, không có blocker liên quan. Nếu chỉ tạo code mà chưa chạy test vì thiếu môi trường, ghi `BLOCKED` hoặc `ĐANG LÀM`, không ghi PASS. Mọi thay đổi sau đó phải cập nhật lại báo cáo liên quan nếu làm mất hiệu lực kết quả cũ.

## 15. Quy tắc cập nhật kế hoạch

- Không thay đổi endpoint, mã UC, tên trường, quy tắc nghiệp vụ hoặc công nghệ trọng yếu chỉ bằng cách sửa kế hoạch này.
- Nếu phát hiện xung đột giữa kế hoạch và nguồn mới hơn, **báo cáo xung đột**; xin quyết định trước khi đổi baseline.
- Khi sinh viên duyệt thay đổi kế hoạch, cập nhật phiên bản, ngày và mục thay đổi; ghi ảnh hưởng đến các giai đoạn chưa làm.
- Giai đoạn đã hoàn thành vẫn có thể phải mở lại nếu thay đổi phía sau làm sai test/contract, nhưng phải ghi rõ hồi quy và bằng chứng kiểm chứng lại.

## 16. Checklist kết thúc toàn bộ Backend

- [ ] E01–E13 đúng method/path/request/response/status/quyền của API Contract.
- [ ] Routes → services → repositories rõ ràng, không lẫn trách nhiệm.
- [ ] PostgreSQL là kho dữ liệu chính; có migration và seed tái lập.
- [ ] Phone/serial/mã phiếu chống trùng ở DB và không lộ dữ liệu ngoài quyền.
- [ ] Token server-side hợp lệ; vai trò và phạm vi trung tâm được kiểm tra.
- [ ] Bảo hành/SLA/snapshot đúng quyết định đã chốt, kiểm thử được ở các giá trị biên.
- [ ] Ticket + log nguyên tử; phê duyệt đồng thời xử lý đúng.
- [ ] Trao đổi không thay đổi SLA/trạng thái.
- [ ] Test có kết quả thực tế và có thể chạy lại bằng hướng dẫn.
- [ ] Yêu cầu **hai thực thể CRUD** của BT2 được xử lý và kiểm chứng hoặc ghi rõ chưa đạt.
- [ ] Docker/Compose Backend + PostgreSQL đã chạy thử; chưa nhầm là NFR03 Fullstack.
- [ ] README Backend cập nhật chính xác.
- [ ] Có đủ `phase-01.md` đến `phase-06.md` phản ánh đúng tình trạng, cộng với decision log khi cần.
- [ ] Mọi sai lệch BT1 được ghi vào `docs/thay-doi-thiet-ke.md`; phần dùng AI có nội dung đề xuất trung thực.
- [ ] **Không tự nhận BT2 hoàn thành** khi Frontend, đóng gói toàn hệ thống hoặc minh chứng khác vẫn thiếu.

---

**Quy tắc cuối:** Bám tài liệu, phạm vi L2 vừa đủ, truy vết được, tái lập được và kiểm chứng được. Luôn ưu tiên **đúng nghiệp vụ và dễ giải thích** hơn viết code thật nhiều.
