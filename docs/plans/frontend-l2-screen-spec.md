# Frontend L2 — Đặc tả màn hình và ánh xạ API

Ngày: **25/10/2026**. Đọc cùng [kế hoạch chính](frontend-l2-implementation-plan.md) và [kế hoạch kiểm chứng](frontend-l2-verification-plan.md). Đây là đặc tả triển khai **đề xuất**, không sửa contract/SRS hoặc xác nhận các tính năng đã được hiện thực.

## 1. Căn cứ dùng khi triển khai

- **SOURCE:** Case Study — Mục 4, 5.1, 6.1–6.2, 7/L2, 8, 9/Bảng 9.1 — trang PDF 6, 8, 10–12, 15–16, 19. QT-01–06 và QT-13–15 liên quan; các quy tắc L4/L5/L8 khác không tự mở rộng L2.
- **DESIGN:** [SRS](../srs.md), [API E01–E13](../api-contract-l2.md), [A01/phụ lục](../api-contract-l2-extension.md), [decision log](../progress/backend/decision-log.md). Mapping dùng FR06→UC07, FR07→UC11, FR08→UC06.
- **DESIGN thị giác:** page Figma `14:2`, WF01 `14:6`, WF02 `14:158`, WF03 `14:268`, file `IYbByIdGl6ksmlp1Yvxld7` đã đọc live ngày lập kế hoạch.
- **IMPLEMENTATION:** client/proxy/DTO hiện có và routes backend đã được đọc. Không suy rằng ảnh hoặc test cũ chứng minh UI dự kiến đã đạt.

## 2. Ma trận sai khác Figma — API và cách xử lý

| Mã kế hoạch | Figma mong đợi | Căn cứ API/implementation | Phương án mặc định — PROPOSAL |
| --- | --- | --- | --- |
| GAP-01 | NV xem danh sách mọi phiếu; tab Tất cả/Mới/Chưa xác minh | E09 chỉ QL; luôn CHUA_XAC_MINH, chỉ filter CHO_PHE_DUYET hoặc DA_PHE_DUYET | QL có hàng chờ/đã duyệt; NV vào WF02 và mở WF03 bằng ID. Không list NV |
| GAP-02 | Tìm mã phiếu/phone, lọc ưu tiên, mới nhất trước | E09 không nhận các query này; sort received_at rồi ticket_id tăng | Bỏ các bộ lọc không hỗ trợ; giữ thứ tự server, không lọc/sort riêng một page rồi coi là toàn tập |
| GAP-03 | Bảng có tên khách/phone/nhóm sự cố/ưu tiên | E09 summary không trả các field này | Cột: mã phiếu, ID khách/thiết bị nếu cần, trung tâm ID, trạng thái phiếu, bảo hành, phê duyệt, tiếp nhận, hạn, Xem. Không gọi E10 cho từng hàng |
| GAP-04 | Hiển thị Lan/Trâm, tên trung tâm và người tiếp nhận | A01 có employee_id/center IDs, không có tên; E10 không trả received_by | Header dùng “Nhân viên #ID / Quản lý #ID”, “Trung tâm #ID”; chi tiết chỉ hiện field có thật. Không đóng gói account config backend lên client |
| GAP-05 | QL xem tên sản phẩm/nhóm sự cố | E10 có product_id/category_id; E05/E06 chỉ cho NV | QL dùng “Sản phẩm #ID”, “Nhóm sự cố #ID”. NV có thể dùng tên đã tải hợp lệ trong phiên, thiếu thì fallback ID; không fetch catalog bằng QL |
| GAP-06 | Giờ tiếp nhận và hạn cam kết xuất hiện trước tạo | E07 chỉ preview bảo hành; E08 chốt received_at/due_date | Trước tạo: giải thích SLA và “Được xác định khi tạo phiếu”; sau 201 hiển thị thời gian server. Không tự tạo hạn được coi là cam kết |
| GAP-07 | Timeline chuyển trạng thái kèm actor | Chưa có API đọc status log; E10 không trả log/received_by | Không dựng “Lịch sử trạng thái”; hiển thị trạng thái hiện tại/thời điểm tiếp nhận có thật. Không biến phê duyệt thành status log |
| GAP-08 | Minh họa lịch sử trao đổi mới trước | E12 sort created_at rồi communication_id tăng | Hiển thị cũ trước, phân trang đúng, sau ghi đi tới trang chứa bản ghi mới |
| GAP-09 | Ba màn hình Figma: list / intake / detail | TD-13 hiện tại tách customer/device và intake, ghép queue/detail | Bố trí lại ba màn hình theo Figma với giới hạn GAP-01–08; ghi thay đổi bố cục khi triển khai |
| GAP-10 | Không có hình login | A01 và BT2 Mục 2.3 yêu cầu login cơ bản | Thiết kế login đồng bộ typography/màu/field với Figma, ghi là đề xuất mới |

Các GAP là mã công việc frontend, **không phải QT/FR/UC mới**. Muốn loại bỏ giới hạn bằng thay đổi backend phải được sinh viên quyết định và cập nhật contract/test trước; không có quyền tự cấp từ kế hoạch này.

## 3. Ngôn ngữ thị giác và thành phần dùng chung

### 3.1. Những gì đã thấy trong Figma

- Wireframe đơn sắc: nền trắng, vùng phụ xám nhạt, chữ đậm và border xám; nút chính xám đậm.
- Font Inter; title màn hình 28px/Semi Bold, logo 16px/Bold, text thường chủ yếu 12–14px, nhãn phụ 11–12px.
- Topbar 64px; sidebar 184px. Ở desktop 1920px, main bắt đầu x=216, còn lề phải khoảng 24px.
- WF02: cột trái khách/thiết bị, cột giữa phân loại, cột phải kiểm tra/tạo. WF03: thông tin/trao đổi bên trái, phê duyệt/cam kết bên phải.
- Các khung ghi nguồn/FR/QT và nhánh ví dụ dưới vùng ứng dụng là tài liệu wireframe; chỉ chuyển hành vi cần thiết vào UI, không render nguyên bảng chú giải.

### 3.2. Quyết định trình bày đề xuất

- Dùng CSS variables cho màu nền/chữ/border/action/focus, spacing 4/8/12/16/24/32 và radius vừa phải. Các giá trị spacing/breakpoint là PROPOSAL, không gọi là token đã xuất từ Figma.
- Ưu tiên `Inter, Arial, sans-serif`; chỉ dùng font local nếu đã có asset được phép. Không phát sinh request Google Fonts hoặc thêm package chỉ để giống wireframe.
- Desktop ≥1280px: giữ ba cột WF02 khi nội dung đủ chỗ; 768–1279px: hai cột và summary xuống hàng; <768px: một cột, điều hướng gọn. QA ở 1920, 1280, 768 và 375px; không đặt fixed canvas 1920px.
- Badge luôn có nhãn chữ cho status/warranty/approval; không dựa riêng vào màu. Disabled/loading/hover/focus/error phải nhận biết được.
- `FormField` có label, hint, lỗi gần ô và liên kết `aria-describedby`; lỗi tổng có `role=alert`, tải/thành công có `role=status` phù hợp.
- Một `main` chính; heading theo thứ bậc, bảng có caption/header, pagination có nhãn, thao tác dùng keyboard được. Focus về trường lỗi đầu hoặc heading sau điều hướng.
- Dữ liệu text render bằng React text node; không dùng HTML từ content/mô tả. Tên dài/serial dài/content nhiều dòng phải wrap, bảng có vùng cuộn khi cần.

## 4. Login — Đăng nhập

**Route:** `/login`. **API:** A01 `POST /api/auth/login`. **Giai đoạn:** FE-02. **Nguồn:** yêu cầu hạ tầng AUTH/BT2, không gán thêm mã FR/US.

### 4.1. Nội dung và payload

| Thành phần | Hành vi |
| --- | --- |
| Nhận diện | MEKONG / MOBILE; “Tiếp nhận và phân loại bảo hành”; form trung tâm trang, không sidebar |
| Tên đăng nhập | autocomplete=username, trim hai đầu, 1–64 Unicode code point, case-sensitive |
| Mật khẩu | type=password, autocomplete=current-password; 1–256 code point, không trim/normalize; nút hiện/ẩn có accessible name |
| Đăng nhập | JSON chỉ `{username,password}`; không gửi role/center hoặc token cũ thay credential |
| Thông báo | Hết phiên, lỗi field, sai credential chung, lỗi kết nối và thử lại |

Không có “ghi nhớ đăng nhập”, đăng ký, đổi/quên mật khẩu hoặc chọn vai trò. Không điền sẵn tài khoản/mật khẩu thật vào source hoặc UI.

### 4.2. Trạng thái và kết quả

- `idle → submitting → success/error`; khóa gửi lặp, label “Đang đăng nhập…”.
- 200: decoder xác minh DTO, client giữ token RAM, provider nhận principal, xóa password; NV vào `/intake`, QL vào `/tickets`, hoặc return path nội bộ hợp lệ.
- 400: hiển thị `fields`, focus trường sai. 401 `INVALID_CREDENTIALS`: “Thông tin đăng nhập không hợp lệ”, giữ username, không tiết lộ user có tồn tại.
- 503/mạng/timeout: giữ username, cho người dùng chủ động thử lại, không vòng lặp tự login. Có thể xóa password khi form bị rời/hết phiên; không lưu ngoài form.
- Guard/đăng xuất/401 dùng phiên bản session: login/request cũ hoàn tất sau logout không được tự gán lại token; 401 của phiên trước không xóa phiên vừa login mới.
- Login thành công nhưng response không đúng schema: không nhận phiên một phần; hiển thị lỗi hợp đồng bằng ngôn ngữ người dùng.

## 5. WF01 — Danh sách/hàng chờ và lối mở phiếu

**Route:** `/tickets`. **Giai đoạn:** FE-05. **Truy vết:** FR06/US06/UC07; lối mở chi tiết hỗ trợ FR08/US08/UC06. Không tạo UC danh sách mới.

### 5.1. Biến thể quản lý

- Title “Phiếu chưa xác minh bảo hành”; mô tả phạm vi các trung tâm được phép, không gọi đây là tất cả phiếu.
- Filter chỉ `CHO_PHE_DUYET` mặc định và `DA_PHE_DUYET`; đổi filter về page=1.
- E09 `GET /api/tickets?approval_status=...&page=...&size=10` theo client hiện tại. Có thể dùng size khác 1–100 nếu đồng bộ UI/client/tests.
- Bảng chỉ có field trong summary tại GAP-03. `status`, `warranty_status`, `approval_status` tách nhãn; dùng formatter ngày giờ.
- “Xem” mở `/tickets/{ticket_id}`; không dùng ticket_code làm path ID. Không thêm nút tiếp nhận cho QL.
- Giữ filter/page trong provider hoặc query UI chỉ chứa enum/page/size hợp lệ; không phone/token. Sau duyệt, fetch lại khi quay về; nếu page cuối vượt tổng mới, về trang hợp lệ rồi tải lại.
- Thứ tự E09 cũ trước phải nhất quán với nhãn trên UI; không đảo riêng các hàng của trang hiện tại.

### 5.2. Biến thể nhân viên

- Không gọi E09, không render bảng giả hoặc lỗi 403 như nội dung mặc định.
- Hiển thị vùng “Mở phiếu bằng ID”, nhập integer dương `Number.isSafeInteger`; label giải thích đây là ID hệ thống, không phải mã `BH-...`.
- Enter/mở hợp lệ điều hướng WF03 gọi E10. Không tìm khách theo phone tại trang này, không suy ID từ counter trong ticket_code.
- Có lối về “Tiếp nhận mới”; phiếu vừa tạo có thể mở lại từ kết quả trong phiên. Không coi danh sách gần đây trong RAM là toàn bộ dữ liệu trung tâm.

### 5.3. Trạng thái tải/rỗng/lỗi

- Loading: skeleton hoặc dòng “Đang tải danh sách phiếu…”, không hiện kết quả filter trước như của filter mới.
- Có dữ liệu: dùng `meta.total` sau filter/scope, nút Trước/Sau dựa `meta.page/meta.size/meta.total`.
- `total=0`: có thể đọc E09 của filter còn lại với size=1 để phân biệt. Cả hai total=0 → “Chưa có phiếu chưa xác minh bảo hành trong phạm vi của bạn”; filter còn lại có dữ liệu → “Không có phiếu phù hợp với lựa chọn hiện tại”.
- Nếu không xác minh được filter còn lại, chỉ nói “Không có phiếu theo lựa chọn hiện tại”; không suy “chưa có phiếu nào trong hệ thống”. Trao đổi rỗng tại WF03 là một trạng thái chưa có dữ liệu xác định riêng.
- Trang vượt phạm vi có total>0 không được báo chưa có dữ liệu; chuyển trang hợp lệ hoặc cho về trang đầu.
- Error: giữ filter/page, “Không thể tải dữ liệu. Vui lòng thử lại”; 403 là thông báo quyền, không xóa phiên như 401.

## 6. WF02 — Tiếp nhận và tạo phiếu

**Route:** `/intake`, chỉ NV. **Giai đoạn:** FE-03/04. **Truy vết:** FR01–FR05/FR07; US01–05/07; UC01–05/11.

### 6.1. Khách hàng — E01/E02

1. Nhập phone, Enter/Tra cứu gọi E01 bằng `encodeURIComponent` hoặc `URLSearchParams`; dấu `+` phải được encode. Không gửi từng phím để phát sinh request không cần thiết.
2. Chuẩn hóa cho kiểm tra UX theo QT-02; server là nơi xác nhận chuẩn hóa/UNIQUE/scope. Phone input là chuỗi, giữ số 0 đầu; raw 1–30 theo contract.
3. Kết quả 200: customer_id/full_name/phone/address; phone dùng đúng bản backend đã che, không ghi đè trường nhập bằng chuỗi masked rồi gửi lại.
4. 404 `CUSTOMER_NOT_FOUND`: mở inline form tạo khách; full_name 1–120 sau trim, phone đã tra cứu, address tùy chọn tối đa255/null. Không tự tạo hồ sơ ngay khi lookup rỗng.
5. E02 201: chọn customer mới, tải thiết bị. 409 `PHONE_ALREADY_EXISTS`: nếu có `existing_customer` thì hiển thị/chọn hồ sơ đó; không có thì giải thích không thể tạo trùng, không dò tài nguyên ngoài quyền.
6. Thay số đang nhập phải vô hiệu kết quả cũ và bỏ chọn customer/device trước thao tác tiếp theo. Request trước về muộn không thay kết quả số mới.

### 6.2. Thiết bị — E03/E04/E05

- Khi có customer: E03 phân trang hoặc query `serial_no` exact. Chuỗi serial sau trim 1–50; giữ hoa/thường/số0 và cho phép serial chữ, không tự áp Luhn/IMEI-only.
- Chọn device từ response cùng customer. Không có device: “Khách hàng chưa có thiết bị”; serial không khớp: “Không tìm thấy thiết bị theo Serial/IMEI này”.
- Tạo device bằng form trong vùng thiết bị: `product_id`, `serial_no`, `purchase_date` ngày hợp lệ hoặc null; không gửi owner/months trong body. Customer lấy từ path.
- Product lấy từ E05, tải thêm trang nếu total vượt size; không hardcode bốn sản phẩm demo. Catalog rỗng/lỗi phải có thông báo và retry phù hợp.
- Date input là `YYYY-MM-DD`, cho phép “Chưa có ngày mua”; không đặt mặc định ngày hôm nay và không dùng UTC conversion làm lệch ngày. Backend kiểm ngày tương lai theo Asia/Ho_Chi_Minh.
- E04 201: chọn device trả về. 409 `SERIAL_ALREADY_EXISTS` có `existing_device` cùng customer: cho dùng bản ghi đó. Không có profile trong lỗi thì không suy ra dữ liệu.
- 409 `DEVICE_OWNER_MISMATCH`: thông báo thiết bị không thuộc khách đang chọn, giữ chủ cũ; không gọi API đổi chủ.
- Thiết bị đã có: ngày mua/tháng bảo hành hiển thị read-only trong intake; sửa hồ sơ thuộc thao tác khác chưa nằm trong kế hoạch này.

### 6.3. Mô tả và phân loại — E06

- `issue_desc` bắt buộc 1–2000 code point sau trim; textarea hỗ trợ xuống dòng và có bộ đếm đúng quy ước phụ lục.
- `category_id` chọn từ E06; không hardcode category IDs hoặc chọn từ nhãn ví dụ. Empty/error catalog không cho tạo phiếu với nhóm giả.
- `priority`: ban đầu chưa chọn; radio/select `CAO`, `TRUNG_BINH`, `THAP`, nhãn Cao/Trung bình/Thấp và giải thích 24/72/120 giờ tính T2–T7.
- Không tự đổi ưu tiên theo nhóm/mô tả. Sai field hiển thị gần ô, giữ nội dung nhập để sửa.
- Không dùng HTML `maxLength=2000` làm kiểm chứng code point vì browser đếm UTF-16. Dùng validator thống nhất, tránh chặn emoji hợp lệ ở biên.

### 6.4. Kiểm bảo hành — E07

- Chọn device gọi `GET /api/devices/{device_id}/warranty`, không gửi `assessment_date` theo ngày máy client trong luồng sử dụng thường.
- Hiển thị `assessed_on`, `purchase_date`, `warranty_months`, `warranty_expires_on`, `warranty_status`, `requires_approval` từ response.
- Thiếu ngày mua: “Chưa xác minh bảo hành — Phiếu cần được quản lý phê duyệt”; vẫn cho tạo khi dữ liệu khác hợp lệ.
- Hết hạn: hiển thị đúng kết quả, không tự từ chối tiếp nhận, không khẳng định miễn phí hoặc yêu cầu duyệt trái DD02.
- Đổi device xóa preview cũ; retry E07 không tạo phiếu. E08 luôn đánh giá lại ở server, preview không phải kết quả lịch sử cuối.

### 6.5. Xác nhận tạo — E08

Request chỉ gồm các field contract:

```json
{
  "customer_id": 1,
  "device_id": 1,
  "center_id": 1,
  "issue_desc": "Mô tả lỗi đã nhập",
  "category_id": 1,
  "priority": "CAO"
}
```

ID trên là minh họa schema, **không dùng làm default trong code**. `center_id` lấy từ principal đang login; actor/time/status/approval/snapshot không được gửi để tự cấp quyền.

| Kết quả | Hành vi UI |
| --- | --- |
| Chưa gửi | Summary khách/thiết bị/nhóm/ưu tiên; center ID; hạn/giờ tiếp nhận chưa được server chốt |
| Đang gửi | Busy, khóa tạo lặp, không đổi khách/thiết bị dưới request đang ghi |
| 201 | Lưu ticket_id/ticket_code và kết quả thật; hiển thị status/warranty/approval/due_date; mở WF03 hoặc tiếp nhận mới |
| 400/404/409 | Giữ input còn hợp lệ, gắn lỗi theo field; tài nguyên đã ngừng/khác chủ thì tải lại/chọn lại, không tự sửa owner |
| Mạng/timeout/503 | Thông báo chưa xác định được kết quả tạo; không auto POST lại; xem Mục 9 |

`Hủy nhập` khi chưa gửi: hỏi bỏ draft nếu có dữ liệu chưa lưu; reset form phiếu, không xóa customer/device đã được tạo qua API. Sau 201 không hiển thị hành động hủy như thể có thể hủy phiếu. Nút “Tiếp nhận mới” tạo draft mới rõ ràng.

## 7. WF03 — Chi tiết, trao đổi và phê duyệt

**Route:** `/tickets/[ticketId]`. **Giai đoạn:** FE-05/06. **API:** E10–E13. **Truy vết:** FR06/08, US06/08, UC07/06.

### 7.1. Đọc chi tiết — E10

- Kiểm route ID là integer dương an toàn trước gọi API; ticket_code chỉ là nhãn hiển thị.
- Header: `ticket_code`, ba badge `status/warranty_status/approval_status` tách riêng; không dùng “Chưa xác minh” như trạng thái vòng đời.
- Thông tin: customer.full_name/phone, device.serial_no/product_id, issue_desc, category_id/priority, center_id.
- Bảo hành lịch sử: `assessed_on`, `purchase_date_snapshot`, `warranty_months_snapshot`, `warranty_expires_on`. Không lấy ngày mua hiện tại qua E03/E07 để thay snapshot.
- Cam kết: `received_at/due_date` từ server; không tính lại SLA khi đọc hoặc duyệt.
- Phê duyệt: `approved_by/approved_at/approval_note` khi có; dùng ID actor, không lấy account config private để điền tên.
- Phiếu của customer/device đã soft delete vẫn đọc lịch sử nếu API cho phép; không tự chặn dựa trạng thái intake.
- 404: “Không tìm thấy phiếu hoặc bạn không có quyền xem”; không phân biệt cho phép suy scope. 403: lỗi vai trò; 401: về login.
- Một vùng lỗi E12 không xóa dữ liệu E10 đã đọc. Thay ID phải xóa dữ liệu/note/content của phiếu trước hoặc quản lý draft theo ID rõ ràng; không ghi nhầm phiếu.

### 7.2. Lịch sử trao đổi — E12/E13

- NV/QL đọc E12 theo page/size. Item dùng communication_id làm key, có content/created_at/created_by; hiển thị “Người ghi #ID”. Thứ tự cũ trước theo API.
- Empty: “Phiếu chưa có trao đổi”; tải lại chỉ vùng lịch sử khi lỗi; giữ vị trí/page nếu không ghi mới.
- Chỉ NV có form content; trim 1–2000 code point, cấm rỗng/toàn whitespace. QL không có nút lưu khả dụng và không được E13.
- POST chỉ `{content}`. Actor/time/ticket scope do server quyết định; không gửi created_by/created_at.
- Ghi 201: xác nhận đã lưu, xóa draft đã lưu, cập nhật tổng và tải trang cuối phù hợp để thấy message mới. Nếu fetch lại lỗi, báo “Đã lưu, chưa tải lại được lịch sử” kèm retry GET.
- Lỗi từ chối trước ghi: giữ draft để sửa/thử lại. Timeout kết quả chưa xác định: không auto gửi lại, không dedup theo content vì hai trao đổi giống nhau có thể hợp lệ.
- Được ghi trao đổi khi phiếu chờ duyệt nếu server cho phép; `can_proceed=false` không đồng nghĩa cấm E13.

### 7.3. Phê duyệt ngoại lệ — E11

- Chỉ QL có action khi ba điều kiện từ E10 là `status=MOI`, `warranty_status=CHUA_XAC_MINH`, `approval_status=CHO_PHE_DUYET`.
- Note không bắt buộc: bỏ trống gửi null hoặc `{}` theo contract; có nội dung phải 1–1000 code point sau trim. Không gửi `approval_status/approved_by/approved_at`.
- Busy: khóa nút; sau thành công hiển thị đã duyệt, actor/time/note từ server và can_proceed mới.
- Duyệt không đổi `status=MOI`, không đổi `warranty_status=CHUA_XAC_MINH`, không đổi due_date hoặc snapshot; không có action tiếp tục sửa chữa/đóng phiếu.
- 409 `ALREADY_APPROVED`: báo người khác đã duyệt, GET E10 lại; giữ metadata đầu. `APPROVAL_NOT_APPLICABLE`: đọc lại và bỏ action nếu không còn hợp lệ.
- 401/403/404 không cập nhật UI như thành công; không coi ẩn nút là bằng chứng NFR02. Sau timeout có thể GET E10 để đối chiếu trước khi người dùng quyết định thao tác tiếp.
- Không thêm nút “Từ chối”, xác minh ngày mua hoặc sửa snapshot vì contract/FR chưa cung cấp hành vi đó.

## 8. Quy ước input, nhãn và lỗi dùng chung

### 8.1. Nhãn enum

| Field | Giá trị backend | Nhãn UI |
| --- | --- | --- |
| warranty_status | CON_BAO_HANH / HET_BAO_HANH / CHUA_XAC_MINH | Còn bảo hành / Hết bảo hành / Chưa xác minh bảo hành |
| approval_status | KHONG_CAN / CHO_PHE_DUYET / DA_PHE_DUYET | Không cần phê duyệt / Chờ phê duyệt / Đã phê duyệt |
| priority | CAO / TRUNG_BINH / THAP | Cao / Trung bình / Thấp |
| status | MOI | Mới |

Các trạng thái khác có trong DTO được map nhãn read-only nếu xuất hiện; không sinh action chuyển trạng thái ngoài L2. Enum ngoài contract là lỗi DTO, không âm thầm ánh xạ thành “Mới”.

### 8.2. Validation và thời gian

- Chuỗi theo phụ lục: trim ECMAScript ở hai đầu, đếm `Array.from(text).length`, không tự normalize Unicode, cấm NUL và surrogate không ghép cặp; password không trim.
- ID dùng integer dương an toàn; chọn select giữ string khi nhập rồi parse có kiểm chứng, không `Number("")` thành0 và gửi đi.
- Phone mask dùng response có quyền từ backend. Phone raw chỉ trong input cần thiết, không đưa vào đường dẫn UI, log hoặc ảnh minh chứng công khai.
- Ngày thuần giữ `YYYY-MM-DD`; timestamp render `dd/MM/yyyy HH:mm` theo `Asia/Ho_Chi_Minh`, giữ giá trị ISO gốc trong dữ liệu. Không hardcode ngày ví dụ của Figma.

### 8.3. Ánh xạ lỗi

| HTTP/loại | Hành vi |
| --- | --- |
| 400 | Field validation hoặc request sai; hiển thị field labels tiếng Việt và giữ dữ liệu nhập |
| 401 tại A01 | Sai credential tại form; không báo hết phiên |
| 401 tại request đã xác thực | Xóa đúng phiên đó, dữ liệu riêng và draft; về login |
| 403 | Báo không đủ quyền, không tự đổi role/center hoặc logout |
| 404 | Phân biệt lookup empty với resource mất/ngoài scope theo code, không rò dữ liệu |
| 409 | Xử lý riêng phone/serial/owner/approval; không dùng thông báo chung làm mất recovery |
| 415 | Client request sai định dạng; thông báo chung và ghi lỗi kỹ thuật an toàn cho sửa code, không yêu cầu người dùng tự đổi HTTP header |
| 500/503/mạng/timeout | Thông báo thân thiện, retry GET; POST tuân theo Mục 9 |
| JSON/DTO không đúng | Thông báo không đọc được dữ liệu, không render object/stack thô hoặc chấp nhận thành công một phần |

## 9. Đồng thời và POST có kết quả chưa xác định

Backend không có idempotency key, cũng không có quy tắc cấm nhiều phiếu mở cùng device. Chống double click tại UI chỉ giảm gửi lặp, không bảo đảm exactly-once qua mất kết nối.

| Thao tác | Cách phục hồi đề xuất |
| --- | --- |
| GET bất kỳ | Retry có chủ đích, giữ điều kiện truy vấn; response cũ không ghi đè điều kiện mới |
| E02 tạo khách | Tra cứu lại phone. Nếu không đọc được do scope/tombstone thì thông báo giới hạn; không tạo hồ sơ khác để lách UNIQUE |
| E04 tạo thiết bị | Tra E03 exact serial trong customer; chỉ dùng existing_device khi API cho phép |
| E08 tạo phiếu | Nếu đã nhận được ID thì GET E10; nếu mất response trước ID, NV không có API tìm theo draft. Báo có thể đã tạo, giữ draft với trạng thái chưa xác định, không tự POST lại. Muốn bảo đảm retry an toàn cần quyết định backend riêng |
| E11 phê duyệt | GET E10 kiểm metadata; không tự ghi đè hoặc lặp để ép kết quả |
| E13 ghi trao đổi | Tải E12 để người dùng kiểm tra; không coi content/time trùng là định danh chắc chắn và không tự gửi lại |

Request hoàn tất sau logout/đổi phiên không được đặt token hay ghi cache mới. 401 muộn từ token cũ phải được so với phiên gốc trước khi xóa phiên hiện tại. Tests cần bao phủ cả trường hợp GET đến sai thứ tự và POST đang chạy khi đổi màn hình.

## 10. Ma trận API để kiểm tra đủ phạm vi

Mọi path dưới đây tính từ `/api`; không có endpoint mới trong bộ kế hoạch.

| API | Method/path | Nơi dùng | Vai trò |
| --- | --- | --- | --- |
| A01 | POST `/auth/login` | Login | Chưa cần token |
| E01 | GET `/customers?phone=...` | WF02 lookup | NV |
| E02 | POST `/customers` | WF02 tạo khách | NV |
| E03 | GET `/customers/{customer_id}/devices` | WF02 chọn/tra serial | NV |
| E04 | POST `/customers/{customer_id}/devices` | WF02 tạo thiết bị | NV |
| E05 | GET `/products` | WF02 danh mục sản phẩm | NV |
| E06 | GET `/issue-categories` | WF02 danh mục nhóm | NV |
| E07 | GET `/devices/{device_id}/warranty` | WF02 preview bảo hành | NV |
| E08 | POST `/tickets` | WF02 tạo phiếu | NV |
| E09 | GET `/tickets` | WF01 hàng chờ/đã duyệt | QL |
| E10 | GET `/tickets/{ticket_id}` | WF03 chi tiết | NV/QL |
| E11 | POST `/tickets/{ticket_id}/warranty-approval` | WF03 duyệt | QL |
| E12 | GET `/tickets/{ticket_id}/communications` | WF03 lịch sử | NV/QL |
| E13 | POST `/tickets/{ticket_id}/communications` | WF03 ghi trao đổi | NV |

PATCH/DELETE Customer/Device đã có ở phụ lục backend nhưng không đưa vào giao diện trong kế hoạch này. Không suy yêu cầu CRUD API của BT2 thành yêu cầu thêm nhiều trang quản trị.
