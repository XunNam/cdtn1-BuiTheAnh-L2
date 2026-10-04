# API Contract — L2: Tiếp nhận và phân loại yêu cầu bảo hành

**Track:** Software Engineering (SE)  
**Sinh viên:** Bùi Thế Anh — 2374802010009  
**Phiên bản:** 0.1 — bản thiết kế tham khảo để sinh viên rà soát và hiện thực  
**Ngày biên soạn:** 04/10/2026  
**Định dạng:** HTTP + JSON; prototype chạy cục bộ.

Tài liệu đặc tả API phục vụ 8 FR/US hiện có, giữ nguyên mã Use Case trong bảng truy vết. Đây là tài liệu bổ sung kỹ thuật cho SRS, không thay thế SRS, đặc tả Use Case, ERD hoặc mã nguồn. Các mục mang nhãn **Đề xuất thiết kế (DD)** là lựa chọn để làm rõ khoảng trống; không được hiểu là quy tắc có sẵn của doanh nghiệp. Sinh viên cần đối chiếu ERD, tự kiểm chứng và giải thích được các lựa chọn này trước khi dùng cho bài nộp.

## 1. Căn cứ và phạm vi

### 1.1. Tài liệu đã đối chiếu

| Nguồn | Vị trí sử dụng | Nội dung làm căn cứ |
| --- | --- | --- |
| BC T04(1).pdf — bản tải lên ngày 04/10/2026, 22 trang | Mục 2, 4, 5, 6, 7; trang 6–22 | US01–US08, FR01–FR08, AC, NFR, ưu tiên và bảng truy vết |
| Use Case Diagram.drawio.xml — bản tải lên ngày 04/10/2026 | Nhãn UC01–UC07 và UC11 | Hai actor; UC07 phê duyệt, UC06 lịch sử trao đổi, UC11 tạo khách hàng |
| CDTN1_Mekong Mobile_Case study Smart CRM.pdf | Mục 3, 4, 5.1, 6.1–6.2, 7–L2, 8, 9, 11 | Thuật ngữ, dữ liệu, ngoại lệ, ràng buộc QT-01–06 và QT-13–15 |
| CDTN1_Tai lieu tu hoc Buoi 03 - Mau dac ta theo chuyen nganh.pdf | Phần A, A2–A3; trang 2–4 | Cấu trúc API contract, quy ước JSON, validation và response mẫu |
| CDTN1_Buoi04_Phan tich yeu cau ca nhan.pdf | Trang PDF 7, phần Track SE | Endpoint cho story MUST; request/response, HTTP status, validation và truy vết |

Số trang trên là số trang PDF. Các số định danh, tên khách hàng và thiết bị trong ví dụ dưới đây là **fixture mô phỏng**, không khẳng định là bản ghi thực tế trong CSV của LMS. Ngày 28/09/2026 và các hạn tương ứng được dùng để đối chiếu AC của FR05. Danh mục nhóm sự cố và ba mức ưu tiên lấy từ case study.

### 1.2. Phạm vi một câu

Nhân viên tiếp nhận tra cứu hoặc tạo khách hàng, ghi nhận thiết bị và mô tả lỗi, chọn nhóm sự cố và mức ưu tiên; hệ thống kiểm tra bảo hành, tạo phiếu Mới và sinh hạn cam kết, còn quản lý phê duyệt ngoại lệ thiếu ngày mua; lịch sử trao đổi được ghi theo phiếu.

**Thuộc L2:** tra cứu/tạo khách hàng phục vụ tiếp nhận, ghi nhận thiết bị, phân loại thủ công, kiểm tra bảo hành, tạo phiếu, phê duyệt ngoại lệ, ghi/xem trao đổi.

**Dependency ảnh hưởng L2:** tài khoản và vai trò; phạm vi trung tâm; danh mục sản phẩm, tháng bảo hành và nhóm sự cố; dữ liệu khách hàng/thiết bị có sẵn. API đọc danh mục là đầu vào cho L2, không mở rộng thành module quản trị danh mục.

**Ngoài phạm vi:** quản trị tài khoản, phân công kỹ thuật viên, chuyển trạng thái sửa chữa, linh kiện, bàn giao, thu phí, báo cáo điều hành, tự động phân loại bằng AI và quản lý toàn bộ vòng đời phiếu. Không cung cấp endpoint xóa khách hàng/phiếu, sửa nội dung trao đổi, đổi chủ thiết bị hoặc phân công kỹ thuật viên.

### 1.3. Khác biệt với ví dụ API của tài liệu tự học

- FR03/AC02 trong báo cáo yêu cầu phải chọn `priority`: contract này không tự điền TRUNG_BINH khi bỏ trống, dù mẫu A3 có mặc định đó.
- FR03 quy định nhân viên chọn nhóm sự cố: `category_id` do nhân viên gửi và server kiểm tra, không tự suy luận từ mô tả lỗi.
- Mã US/UC lấy theo báo cáo và sơ đồ của sinh viên, không sao chép mã US trong ví dụ A3.
- Mẫu A3 nêu lỗi 409 khi thiết bị đã có phiếu chưa đóng. Báo cáo và Bảng 9.1 chưa đặc tả ràng buộc này: **không áp dụng nó trong bản này**. Nếu chọn áp dụng, phải bổ sung FR/AC và kiểm thử trước.
- Mẫu A3 nêu 422 khi hết bảo hành và chưa phê duyệt; QT-05 của case study chỉ nói rõ phê duyệt khi thiếu ngày mua. Bản này phân biệt hai tình huống theo DD02 bên dưới, không gán thêm yêu cầu phê duyệt thiết bị hết hạn cho QT-05.

## 2. Các quyết định thiết kế để hoàn thiện hợp đồng

| Mã | Lựa chọn trong phiên bản này | Căn cứ và giới hạn |
| --- | --- | --- |
| DD01 | Thiếu ngày mua vẫn được tạo phiếu MOI; `warranty_status=CHUA_XAC_MINH`, `approval_status=CHO_PHE_DUYET`, `can_proceed=false`. Phê duyệt sau khi phiếu tồn tại. | Giải quyết thứ tự giữa FR04, FR05 và FR06. Phê duyệt không chuyển trạng thái phiếu sang Đã phân công/Đang xử lý. |
| DD02 | Hết bảo hành vẫn tạo được phiếu sửa chữa: `HET_BAO_HANH`, `KHONG_CAN`, `can_proceed=true`. Phí và chấp nhận phí thuộc luồng sau, không suy ra miễn phí. | Case study Mục 3 định nghĩa phiếu gồm bảo hành hoặc sửa chữa; Mục 5.1 có lựa chọn tính phí. Đây là chính sách đề xuất, cần xác nhận vì ví dụ A3 có cách xử lý khác. |
| DD03 | Có phạm vi dữ liệu được server xác định. Đề xuất prototype gắn `customer.center_id` với trung tâm tiếp nhận ban đầu; device kế thừa phạm vi customer; ticket có `center_id`. | QT-14 bắt buộc kiểm soát phạm vi, nhưng từ điển customer không có center_id. Đây là điều chỉnh ERD đề xuất, không phải cột nguyên bản. Khách hàng dùng nhiều trung tâm cần chính sách chia sẻ khác, chưa nằm trong prototype. Phone vẫn UNIQUE toàn hệ thống. |
| DD04 | Server xác định `received_at`, người tiếp nhận, người phê duyệt và thời gian ghi trao đổi. Preview bảo hành có thể nhận `assessment_date`, nhưng lúc tạo phiếu phải tính lại. | Tránh client sửa thời điểm để đổi SLA hoặc kết luận bảo hành. Kiểm thử AC cố định thời gian dùng đồng hồ test của server. |
| DD05 | Cộng tháng theo lịch để xác định hạn bảo hành; ngày cuối cùng vẫn còn bảo hành. Nếu ngày tương ứng không tồn tại, dùng ngày cuối tháng. | QT-05 diễn đạt chênh lệch ngày so với số tháng; nguồn chưa quy định chi tiết phép cộng tháng. Không quy đổi một tháng thành 30 ngày. |
| DD06 | SLA đếm thời gian 24 giờ/ngày từ thứ Hai đến thứ Bảy, bỏ toàn bộ Chủ nhật, theo Asia/Ho_Chi_Minh. Không tự thêm ngày lễ hay giờ hành chính. Hạn đúng 00:00 Chủ nhật chuyển thành 00:00 thứ Hai. | QT-04 không cho lịch ca làm việc/ngày lễ và quy tắc biên. Đây là cách diễn giải đề xuất, phải kiểm thử và xác nhận. |
| DD07 | Có API ghi nhận thiết bị mới trong phạm vi customer. Tháng bảo hành lấy từ danh mục sản phẩm đáng tin cậy, không nhận do client tự khai. | FR02 nói ghi nhận thiết bị nhưng AC chỉ mô tả thiết bị có sẵn. API mới là cách hiện thực đề xuất để khách hàng mới ở FR07 có thể tiếp tục L2; không hỗ trợ đổi chủ. |
| DD08 | `issue_desc` dài 1–2000 ký tự sau trim; nội dung trao đổi 1–2000. | FR02 chỉ yêu cầu không trống; mẫu A3 yêu cầu mô tả 10–2000. Dùng tối thiểu 1 để bám AC hiện tại, tối đa 2000 là ngưỡng thiết kế. |
| DD09 | Phê duyệt lưu vào các trường trên ticket; trao đổi là bản ghi riêng; cả hai không dùng chung với ticket_status_log. | Tránh lẫn lịch sử nghiệp vụ với chuyển trạng thái theo QT-06. Trường/bảng bổ sung phải được đưa vào ERD trước khi code. |
| DD10 | Cơ chế xác thực là Bearer token với principal do server kiểm chứng. Hợp đồng không chọn JWT hay một thư viện cụ thể. | NFR02 yêu cầu kiểm soát quyền. Cấp token/đăng nhập là dependency hạ tầng, chưa bổ sung FR đăng nhập hay module quản trị người dùng. |

Những lựa chọn này được nêu để hợp đồng có hành vi xác định, không phải để tuyên bố mọi khoảng trống đã được giảng viên phê duyệt. Đặc biệt cần rà DD01–03, DD05–07 và DD09 với phạm vi/ERD của sinh viên.

## 3. Quy ước chung

### 3.1. Kết nối và xác thực

- Base URL đề xuất: `http://localhost:3001/api`.
- Request đọc: `Accept: application/json` và `Authorization: Bearer <access_token>`.
- Request có body: thêm `Content-Type: application/json`.
- Mọi endpoint trong tài liệu yêu cầu xác thực. Server kiểm chứng token, lấy `employee_id`, `role`, `active_center_id` và `allowed_center_ids`; không tin các giá trị này nếu gửi từ body/query.
- Vai trò: `NHAN_VIEN_TIEP_NHAN` và `QUAN_LY_TTBH`. Token hết hạn, không hợp lệ hoặc không có token trả 401. Vai trò không được phép gọi endpoint trả 403.
- `active_center_id` của nhân viên phải thuộc `allowed_center_ids`. Dữ liệu danh mục chung không bị lọc theo trung tâm.
- HTTP cục bộ dùng cho demo. Khi vận hành trên mạng thật phải thiết kế bảo vệ kết nối phù hợp; việc vận hành đó nằm ngoài phạm vi bản này.

### 3.2. Kiểu và định dạng

- JSON UTF-8, tên trường `snake_case`; success đơn lẻ có `{ "data": ... }`.
- ID trong ví dụ là số nguyên dương. Phiên bản prototype giới hạn ID trong miền số nguyên an toàn của JSON/JavaScript (≤9007199254740991); nếu hệ thống dùng toàn miền BIGINT, cần đổi thống nhất hợp đồng ID thành chuỗi.
- Ngày: `YYYY-MM-DD`. Timestamp: ISO 8601 có offset, ví dụ `2026-09-28T09:00:00+07:00`.
- Các khoảng thời gian được tính theo `Asia/Ho_Chi_Minh`. Lưu UTC hoặc timestamp có múi giờ ở DB là lựa chọn triển khai; output phải đúng offset đã quy định.
- Trường tùy chọn chỉ được nhận `null` khi bảng validation cho phép. Chuỗi được trim trước khi kiểm tra không trống/độ dài; độ dài tính theo ký tự Unicode.
- Request có body chỉ nhận các trường được liệt kê; trường lạ hoặc trường chỉ đọc trả 400. Tham số query lạ trả 400. Tham số lặp cho một giá trị đơn trả 400.
- Pagination: `page` mặc định 1; `size` mặc định 20, từ 1–100. Danh sách trả `meta: { page, size, total }`; `total` là số bản ghi sau lọc quyền và bộ lọc, trước phân trang. Trang ngoài phạm vi trả 200 với data rỗng.
- Không sử dụng tiền tệ trong API L2 này. Nếu bổ sung về sau, quy ước theo mẫu nguồn là số nguyên VND.

### 3.3. Chuẩn hóa và che số điện thoại

1. Trim chuỗi; loại dấu cách và dấu chấm; chấp nhận tiền tố `+84` hoặc `84` và chuyển thành `0`.
2. Sau chuẩn hóa phải khớp `^0[0-9]{9}$`. Không tự suy đoán/chỉnh số thiếu, thừa hoặc chứa ký tự khác.
3. Tra cứu và kiểm tra UNIQUE dùng cùng hàm chuẩn hóa; raw input có giới hạn 30 ký tự theo lựa chọn kỹ thuật.
4. Ví dụ `+84 854.141.105`, `84854141105`, `0854 141 105` đều thành `0854141105`.
5. Mọi trường phone có cấu trúc trong success/error/existing_customer trả cho nhân viên ở dạng che: `085****105`; quản lý được xem `0854141105` theo QT-15. Không dùng che ở UI để thay thế che ở response server.
6. Không phản hồi dữ liệu hồ sơ ngoài phạm vi. Xung đột số điện thoại ngoài phạm vi chỉ trả thông báo chung; không trả ID/tên/số điện thoại của hồ sơ đó. Phạm vi gồm cả bản ghi ngừng sử dụng; không tạo lại cùng phone để né QT-01/QT-13.

### 3.4. Phân quyền dữ liệu

- Nhân viên chỉ đọc/ghi tại trung tâm của mình. Khi tạo customer/device/communication, phạm vi được server kiểm tra theo DD03.
- `center_id` trong POST ticket là trung tâm tiếp nhận; nhân viên chỉ dùng `active_center_id`. Sai trung tâm trả 403, không đổi trung tâm theo client.
- Quản lý chỉ xem/phê duyệt ticket thuộc `allowed_center_ids`, không mặc định có quyền toàn công ty.
- Tài nguyên truy cập bằng ID ngoài phạm vi trả 404 giống tài nguyên không tồn tại. Bộ lọc danh sách chạy sau ràng buộc phạm vi.
- Không có endpoint DELETE. Không tự triển khai soft delete như một chức năng người dùng mới; bản ghi đã được đánh dấu ngừng sử dụng không được dùng để tạo phiếu mới và UNIQUE vẫn được bảo toàn.

### 3.5. Cấu trúc lỗi và HTTP status

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ",
    "fields": {
      "priority": "Phải chọn mức ưu tiên."
    }
  }
}
```

| HTTP | Trường hợp |
| --- | --- |
| 200 | Đọc dữ liệu; kiểm tra bảo hành; phê duyệt thành công. |
| 201 | Tạo customer/device/ticket/communication thành công. |
| 400 | JSON sai, trường/tham số sai kiểu, thiếu/không hợp lệ hoặc cố ghi trường chỉ đọc. |
| 401 | Chưa xác thực, token hết hạn/không hợp lệ. |
| 403 | Vai trò bị cấm hoặc center_id yêu cầu không thuộc quyền. |
| 404 | Tài nguyên thiếu, ngừng sử dụng hoặc ngoài phạm vi (không lộ sự tồn tại). |
| 409 | Phone/serial trùng; sai chủ thiết bị; phê duyệt lặp hoặc ticket không cần phê duyệt. |
| 415 | Body không dùng application/json. |
| 500 | Lỗi nội bộ; không trả stack trace, câu SQL hay thông tin token. |

Các endpoint đều có thể trả lỗi chung 401/403; endpoint có body còn có 400 JSON không hợp lệ và 415 sai Content-Type. Mục 7 liệt kê ít nhất hai lỗi tiêu biểu cho từng endpoint; lỗi nghiệp vụ và trường validation phải dùng mã ổn định thay vì chỉ dựa vào message. Không dùng response lỗi để thay đổi dữ liệu.

## 4. Mô hình dữ liệu trao đổi

### 4.1. Danh mục giá trị

| Trường | Giá trị hợp lệ | Ghi chú |
| --- | --- | --- |
| priority | CAO, TRUNG_BINH, THAP | Bắt buộc chọn, không có mặc định tại POST ticket |
| warranty_status | CON_BAO_HANH, HET_BAO_HANH, CHUA_XAC_MINH | Kết luận từ dữ liệu, không phải trạng thái vòng đời |
| approval_status | KHONG_CAN, CHO_PHE_DUYET, DA_PHE_DUYET | Kết quả kiểm soát ngoại lệ, không phải kết luận còn bảo hành |
| status khi tạo phiếu | MOI | Những trạng thái vòng đời khác không có endpoint cập nhật trong contract này |

`can_proceed` là trường tính toán: true nếu không cần phê duyệt hoặc đã phê duyệt; false nếu CHO_PHE_DUYET. Nó thể hiện đã vượt qua cổng kiểm soát L2, không nghĩa là phiếu đã được phân công hoặc đang sửa.

### 4.2. Dữ liệu đã có và phần cần bổ sung vào ERD

| Dữ liệu | Căn cứ | Cách sử dụng |
| --- | --- | --- |
| customer_id, full_name, phone, address, created_at | Case study Mục 8, customer | Tra cứu và tạo customer; contract không bổ sung email/segment vào body vì FR07 chỉ cần họ tên, phone |
| device_id, customer_id, product_id, serial_no, purchase_date, warranty_months | Case study Mục 8, device | Thiết bị và dữ liệu kiểm tra bảo hành |
| ticket_id, ticket_code, customer_id, device_id, center_id, issue_desc, category_id, priority, status, received_at, due_date | Case study Mục 8, ticket | Dữ liệu tạo phiếu |
| log_id, ticket_id, from_status, to_status, changed_at, changed_by, note | Case study Mục 8, ticket_status_log | Ghi lần đầu `NULL → MOI` cùng giao dịch tạo phiếu |
| category_id và tên nhóm sự cố | Case study Mục 3/Mục 8, issue_category | Danh mục đọc; tên cột API đề xuất là category_name |
| product_id, product_name, warranty_months | Mục 8 device liên kết product; dữ liệu product là dependency | Hai trường tên/tháng trong response danh mục là schema API đề xuất; cần xác nhận từ CSV/config, không khẳng định có nguyên dạng trong nguồn |
| customer.center_id | DD03 | Cột đề xuất để prototype áp dụng QT-14; không có trong customer tham chiếu |
| warranty_status, assessed_on, warranty_expires_on, purchase_date_snapshot, warranty_months_snapshot | DD01/DD05, FR04 | Thêm trên ticket để giữ kết quả kiểm tra tại lúc tiếp nhận |
| approval_status, approved_by, approved_at, approval_note | DD01/DD09, FR06 | Thêm trên ticket; không cần một bảng approval riêng ở prototype |
| communication_id, ticket_id, content, created_at, created_by | FR08, case study Mục 4 phát biểu chị Lan | Bảng/quan hệ ticket_communication đề xuất; nguồn không có sẵn trong từ điển tham chiếu |

Không dùng `ticket_status_log.note` để thay thế lịch sử trao đổi. Không ghi một lần chuyển trạng thái giả khi phê duyệt, vì ticket vẫn MOI. Phê duyệt lưu actor/time trên ticket và bảo toàn lần phê duyệt đầu.

Nguồn tham chiếu có `ticket.is_warranty BOOLEAN NOT NULL`. Trạng thái CHUA_XAC_MINH không thể biểu diễn trung thực bằng boolean này. Bản API dùng `warranty_status` và **không trả/suy diễn is_warranty khi chưa xác minh**. Trước khi hiện thực, cần điều chỉnh ERD: đề xuất thay boolean bằng enum ba giá trị, hoặc cho phép boolean NULL kèm trạng thái xác minh. Không lưu false rồi diễn giải là chắc chắn hết bảo hành, cũng không đổi thành true chỉ vì quản lý cho phép tiếp tục xử lý.

## 5. Quy tắc nghiệp vụ dùng trong API

### 5.1. Kiểm tra bảo hành

- Ngày đánh giá dùng ngày địa phương của received_at khi tạo phiếu.
- Nếu purchase_date null: CHUA_XAC_MINH, expires_on null, cần phê duyệt.
- Nếu có ngày mua: expires_on = purchase_date cộng warranty_months theo DD05; purchase_date ≤ assessed_on ≤ expires_on là CON_BAO_HANH; assessed_on > expires_on là HET_BAO_HANH.
- purchase_date ở tương lai so với ngày tiếp nhận là dữ liệu không hợp lệ, không được coi là còn bảo hành.
- warranty_months lấy từ dữ liệu thiết bị đáng tin cậy; POST ghi thiết bị lấy từ danh mục product/config. Contract đề xuất miền 0–120 tháng cho dữ liệu tham chiếu; 0 nghĩa không có thời hạn sau ngày mua. Miền này chưa được nguồn quy định, cần kiểm tra seed/ERD.
- Khi tạo phiếu, lưu snapshot ngày mua/tháng bảo hành và ngày đánh giá để kết quả không đổi theo lần đọc hoặc lần phê duyệt sau đó.
- GET kiểm tra là preview, không ghi DB hay tạo phiếu. Server tính lại ở POST ticket.

### 5.2. Hạn cam kết

- CAO: 24 giờ; TRUNG_BINH: 72 giờ; THAP: 120 giờ theo QT-04.
- Cộng thời gian trên lịch DD06; không tính Chủ nhật, không tự thêm ngày lễ.
- Nếu nhận Chủ nhật: không tích lũy SLA trước thứ Hai 00:00; chính sách nhận Chủ nhật/giờ hành chính cần xác nhận với giảng viên.
- Không nhận due_date từ client; kể cả quản lý không có endpoint chỉnh SLA trong phạm vi này.

| Thời điểm tiếp nhận cố định ở môi trường test | Mức ưu tiên | Hạn cam kết theo DD06 |
| --- | --- | --- |
| 28/09/2026 09:00, thứ Hai | CAO | 29/09/2026 09:00, thứ Ba — FR05/AC01 |
| 28/09/2026 09:00, thứ Hai | THAP | 03/10/2026 09:00, thứ Bảy — FR05/AC02 |
| 03/10/2026 09:00, thứ Bảy | CAO | 05/10/2026 09:00, thứ Hai — kiểm chứng bỏ Chủ nhật |
| 02/10/2026 09:00, thứ Sáu | TRUNG_BINH | 06/10/2026 09:00, thứ Ba |

### 5.3. Giao dịch và đồng thời

- POST customer: UNIQUE phone sau chuẩn hóa là ràng buộc DB. Hai request cùng phone: chỉ một tạo thành công; request còn lại nhận 409 và hồ sơ hiện có nếu được phép đọc.
- POST device: UNIQUE serial_no; không sửa chủ sở hữu khi trùng. Nếu serial thuộc khách khác, trả 409 và giữ nguyên chủ sở hữu.
- POST ticket: kiểm tra quyền/ownership/danh mục; tạo ticket, mã phiếu duy nhất và log `NULL → MOI` trong cùng transaction. Một bước lỗi thì rollback toàn bộ, không có phiếu thiếu log. Mã phiếu không sinh bằng COUNT()+1.
- POST approval: kiểm tra CHO_PHE_DUYET và cập nhật có điều kiện trong transaction/row lock. Hai quản lý phê duyệt đồng thời: một 200, một 409 ALREADY_APPROVED; không ghi đè người/thời gian phê duyệt.
- POST communication: server gắn ticket, employee và timestamp; không sửa/xóa bản ghi cũ. Gửi lại một request có thể tạo thêm một bản ghi; contract này chưa cam kết idempotency cho các POST tạo mới. UI phải tránh bấm gửi nhiều lần, và khi timeout phải đọc lại trước khi thử tạo lại.
- Không có endpoint “bắt đầu sửa chữa” trong L2. FR06/AC02 được thể hiện bằng can_proceed=false, kiểm soát tại server và đặc tả UC; kiểm thử chặn lệnh chuyển sang xử lý thuộc dependency của luồng sau. Nếu cần một API thực sự thực hiện bước đó, phải bổ sung phạm vi/FR/UC, không tạo endpoint giả chỉ trả thông báo.

## 6. Danh sách endpoint và truy vết

| API | HTTP và đường dẫn (sau /api) | Mục đích | FR | US | UC | MoSCoW |
| --- | --- | --- | --- | --- | --- | --- |
| E01 | GET `/customers` | Tra cứu khách hàng theo phone | FR01 | US01 | UC01 | MUST |
| E02 | POST `/customers` | Tạo khách hàng chưa tồn tại | FR07 | US07 | UC11 | SHOULD |
| E03 | GET `/customers/{customer_id}/devices` | Đọc/chọn thiết bị của khách đang tiếp nhận | FR02 | US02 | UC02 | MUST |
| E04 | POST `/customers/{customer_id}/devices` | Ghi nhận thiết bị mới cho khách — DD07 | FR02 | US02 | UC02 | MUST; thiết kế bổ sung |
| E05 | GET `/products` | Đọc sản phẩm và tháng bảo hành làm đầu vào ghi nhận thiết bị | FR02, FR04 | US02, US04 | UC02, UC04 | MUST — dependency |
| E06 | GET `/issue-categories` | Đọc danh mục nhóm sự cố cho nhân viên chọn | FR03 | US03 | UC03 | MUST |
| E07 | GET `/devices/{device_id}/warranty` | Preview tình trạng bảo hành | FR04 | US04 | UC04 | MUST |
| E08 | POST `/tickets` | Lưu thông tin tiếp nhận, phân loại, tạo phiếu và SLA | FR02, FR03, FR04, FR05 | US02, US03, US04, US05 | UC02, UC03, UC04, UC05 | MUST |
| E09 | GET `/tickets` | Quản lý xem danh sách phiếu chưa xác minh | FR06 | US06 | UC07 | MUST |
| E10 | GET `/tickets/{ticket_id}` | Đọc phiếu để xem xét phê duyệt hoặc truy lại trao đổi | FR06, FR08 | US06, US08 | UC07, UC06 | MUST cho FR06; hỗ trợ SHOULD FR08 |
| E11 | POST `/tickets/{ticket_id}/warranty-approval` | Phê duyệt ngoại lệ thiếu ngày mua | FR06 | US06 | UC07 | MUST |
| E12 | GET `/tickets/{ticket_id}/communications` | Xem lịch sử trao đổi theo phiếu | FR08 | US08 | UC06 | SHOULD |
| E13 | POST `/tickets/{ticket_id}/communications` | Ghi một lần trao đổi với khách | FR08 | US08 | UC06 | SHOULD |

Một US có thể dùng nhiều endpoint; nhiều FR có thể được hiện thực trong một POST ticket. Không ép một FR thành một endpoint hoặc lưu từng bước giao diện vào DB. Dữ liệu chưa lưu (issue_desc, category_id, priority) được UI giữ cho đến E08; server vẫn kiểm tra lại toàn bộ.

## 7. Đặc tả chi tiết từng endpoint

Đường dẫn ví dụ đã bao gồm /api. Mỗi ví dụ là một tình huống độc lập với seed/điều kiện trước phù hợp (ví dụ E01 có sẵn phone, E02 phone chưa tồn tại); không chạy nối tiếp nguyên trạng tất cả ví dụ trên cùng DB. Request body là JSON đúng cú pháp, không có comment. Success/error là minh họa schema và hành vi; các ID, timestamp phải lấy từ dữ liệu và đồng hồ server khi chạy thật.

### 7.1. E01 — GET `/customers`

**Mục đích:** Tra cứu khách hàng theo phone.  
**Truy vết:** FR01 ↔ US01 ↔ UC01; MUST.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
GET /api/customers?phone=%2B84%20854.141.105
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| phone | Query, bắt buộc | Chuỗi 1–30 ký tự; chuẩn hóa về 10 chữ số bắt đầu 0 | Số điện thoại không hợp lệ. |

**Response 200:**

```json
{
  "data": {
    "customer_id": 1024,
    "full_name": "Nguyễn Văn Minh",
    "phone": "085****105",
    "address": "Quận 10, TP. Hồ Chí Minh",
    "created_at": "2026-09-01T10:00:00+07:00"
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "phone": "Số điện thoại không hợp lệ."
    }
  }
}
```

HTTP 404:

```json
{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Không tìm thấy khách hàng.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Tra cứu bằng phone đã chuẩn hóa. Không tồn tại hoặc ngoài phạm vi trả 404, không tự tạo hồ sơ. Nhân viên chỉ nhận phone đã che. Request có +84 phải URL-encode dấu + để tránh bị giải mã thành dấu cách. Hồ sơ ngừng sử dụng cũng không được trả như hồ sơ hoạt động.

### 7.2. E02 — POST `/customers`

**Mục đích:** Tạo khách hàng chưa tồn tại.  
**Truy vết:** FR07 ↔ US07 ↔ UC11; SHOULD.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
POST /api/customers
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "full_name": "Nguyễn Văn Minh",
  "phone": "+84 854.141.105",
  "address": "Quận 10, TP. Hồ Chí Minh"
}
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| full_name | Body, bắt buộc | Chuỗi sau trim, 1–120 ký tự | Họ tên là trường bắt buộc; tối đa 120 ký tự. |
| phone | Body, bắt buộc | Chuỗi 1–30 ký tự; chuẩn hóa như E01; UNIQUE toàn hệ thống | Số điện thoại không hợp lệ hoặc đã tồn tại. |
| address | Body, tùy chọn | Chuỗi tối đa 255 ký tự hoặc null; bỏ qua → null | Địa chỉ tối đa 255 ký tự. |

**Response 201:**

```json
{
  "data": {
    "customer_id": 1024,
    "full_name": "Nguyễn Văn Minh",
    "phone": "085****105",
    "address": "Quận 10, TP. Hồ Chí Minh",
    "created_at": "2026-09-01T10:00:00+07:00"
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "full_name": "Họ tên là trường bắt buộc."
    }
  }
}
```

HTTP 409:

```json
{
  "error": {
    "code": "PHONE_ALREADY_EXISTS",
    "message": "Số điện thoại đã có hồ sơ. Hãy sử dụng hồ sơ hiện có trong phạm vi được phép.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Server tự sinh customer_id và created_at, gán phạm vi theo DD03. Thành công chỉ tạo một customer; chưa tạo device/ticket. Khi phone trùng và hồ sơ thuộc quyền: response 409 có thể thêm `error.existing_customer` theo schema Customer đã che phone để UI hiển thị hồ sơ đúng FR07/AC02. Ngoài phạm vi không có existing_customer. Đây là phần mở rộng lỗi được quy định riêng, không áp dụng cho những lỗi khác. Kiểm tra UNIQUE ở DB để xử lý đồng thời. Header Location: `/api/customers?phone=0854141105` không được dùng vì chứa phone thô; bản này không phát hành Location cho customer.

### 7.3. E03 — GET `/customers/{customer_id}/devices`

**Mục đích:** Đọc/chọn thiết bị của khách đang tiếp nhận.  
**Truy vết:** FR02 ↔ US02 ↔ UC02; MUST.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
GET /api/customers/1024/devices?serial_no=356938035643809&page=1&size=20
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| customer_id | Path, bắt buộc | Số nguyên dương; customer hoạt động, thuộc quyền | Không tìm thấy khách hàng. |
| serial_no | Query, tùy chọn | Chuỗi trim 1–50 ký tự; khớp chính xác, không tự đổi hoa/thường | Serial/IMEI không hợp lệ. |
| page, size | Query, tùy chọn | Theo quy ước pagination | Phân trang không hợp lệ. |

**Response 200:**

```json
{
  "data": [
    {
      "device_id": 3311,
      "customer_id": 1024,
      "product_id": 101,
      "serial_no": "356938035643809",
      "purchase_date": "2026-09-01",
      "warranty_months": 12
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total": 1
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "serial_no": "Serial/IMEI tối đa 50 ký tự."
    }
  }
}
```

HTTP 404:

```json
{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Không tìm thấy khách hàng trong phạm vi được phép.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Customer tồn tại nhưng chưa có thiết bị hoặc không khớp serial: 200 data=[]; không hiển thị thiết bị của khách khác. Danh sách sắp device_id tăng dần. Giữ serial là chuỗi để không mất số 0 đầu. IMEI thông thường 15 chữ số, nhưng trường này chứa cả serial nên không bắt mọi serial có đúng 15 chữ số. Không tạo/lưu mô tả lỗi ở endpoint đọc này; issue_desc được lưu cùng POST ticket.

### 7.4. E04 — POST `/customers/{customer_id}/devices`

**Mục đích:** Ghi nhận thiết bị mới cho khách — DD07.  
**Truy vết:** FR02 ↔ US02 ↔ UC02; MUST; thiết kế bổ sung.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
POST /api/customers/1024/devices
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "product_id": 101,
  "serial_no": "356938035643809",
  "purchase_date": "2026-09-01"
}
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| customer_id | Path, bắt buộc | Customer hoạt động, thuộc quyền | Không tìm thấy khách hàng. |
| product_id | Body, bắt buộc | Số nguyên dương; danh mục sản phẩm tồn tại và dùng được | Không tìm thấy sản phẩm. |
| serial_no | Body, bắt buộc | Chuỗi trim 1–50 ký tự; UNIQUE; không đổi chủ khi trùng | Serial/IMEI không hợp lệ hoặc đã tồn tại. |
| purchase_date | Body, tùy chọn | YYYY-MM-DD hợp lệ hoặc null; không sau ngày server hiện tại; bỏ qua → null | Ngày mua không hợp lệ. |

**Response 201:**

```json
{
  "data": {
    "device_id": 3311,
    "customer_id": 1024,
    "product_id": 101,
    "serial_no": "356938035643809",
    "purchase_date": "2026-09-01",
    "warranty_months": 12
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "purchase_date": "Ngày mua không được nằm trong tương lai."
    }
  }
}
```

HTTP 409:

```json
{
  "error": {
    "code": "DEVICE_OWNER_MISMATCH",
    "message": "Thiết bị không thuộc về khách hàng được chọn.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Chỉ tạo thiết bị nếu serial chưa tồn tại; server sinh device_id và lấy warranty_months từ product/config tin cậy. Không nhận customer_id, warranty_months hoặc chủ sở hữu trong body. Trùng serial cùng khách: 409 SERIAL_ALREADY_EXISTS; có thể trả existing_device thuộc quyền để nhân viên chọn lại. Trùng serial khách khác: 409 DEVICE_OWNER_MISMATCH, không trả hồ sơ khách khác. product_id/customer_id không tồn tại hoặc ngoài quyền: 404. Mô tả lỗi thuộc phiếu, không thuộc device. API này chưa có AC trực tiếp cho thiết bị mới; cần bổ sung AC tương ứng theo DD07 trước khi hiện thực.

### 7.5. E05 — GET `/products`

**Mục đích:** Đọc sản phẩm và tháng bảo hành làm đầu vào ghi nhận thiết bị.  
**Truy vết:** FR02, FR04 ↔ US02, US04 ↔ UC02, UC04; MUST — dependency.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
GET /api/products?page=1&size=20
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| page, size | Query, tùy chọn | Theo quy ước pagination | Phân trang không hợp lệ. |

**Response 200:**

```json
{
  "data": [
    {
      "product_id": 101,
      "product_name": "Điện thoại mẫu A",
      "warranty_months": 12
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total": 1
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "size": "Size phải từ 1 đến 100."
    }
  }
}
```

HTTP 401:

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Yêu cầu đăng nhập bằng token hợp lệ.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Danh sách cấu hình/dữ liệu mẫu tin cậy; sort product_id tăng dần. Không có endpoint tạo/sửa/xóa sản phẩm. Product name và warranty_months trong ví dụ là fixture đề xuất vì chưa đọc CSV thực tế. Seed cần có warranty_months để E04 không nhận số tháng bảo hành tùy ý từ client; nếu seed thiếu/sai, server không tạo device và trả 500 CONFIGURATION_ERROR (không gửi chi tiết nội bộ).

### 7.6. E06 — GET `/issue-categories`

**Mục đích:** Đọc danh mục nhóm sự cố cho nhân viên chọn.  
**Truy vết:** FR03 ↔ US03 ↔ UC03; MUST.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
GET /api/issue-categories
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation:** không nhận query hoặc body; yêu cầu token hợp lệ và đúng vai trò.

**Response 200:**

```json
{
  "data": [
    {
      "category_id": 1,
      "category_name": "Màn hình"
    },
    {
      "category_id": 2,
      "category_name": "Pin"
    },
    {
      "category_id": 3,
      "category_name": "Sạc"
    },
    {
      "category_id": 4,
      "category_name": "Phần mềm"
    },
    {
      "category_id": 5,
      "category_name": "Nước vào"
    },
    {
      "category_id": 6,
      "category_name": "Khác"
    }
  ]
}
```

**Hai response lỗi tiêu biểu:**

HTTP 401:

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Yêu cầu đăng nhập bằng token hợp lệ.",
    "fields": {}
  }
}
```

HTTP 403:

```json
{
  "error": {
    "code": "ROLE_FORBIDDEN",
    "message": "Vai trò không có quyền gọi endpoint này.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Danh mục nhỏ nên không phân trang; thứ tự category_id tăng dần. Tên sáu nhóm theo case study, ID 1–6 là fixture, phải thay bằng ID seed thực tế. Không tự phân loại lỗi bằng AI. API không nhận query/body; query lạ trả 400. Bộ chọn mức ưu tiên dùng enum trong hợp đồng, không cần endpoint riêng cho ba giá trị cố định.

### 7.7. E07 — GET `/devices/{device_id}/warranty`

**Mục đích:** Preview tình trạng bảo hành.  
**Truy vết:** FR04 ↔ US04 ↔ UC04; MUST.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
GET /api/devices/3311/warranty?assessment_date=2026-09-30
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| device_id | Path, bắt buộc | Thiết bị thuộc customer được phép đọc | Không tìm thấy thiết bị. |
| assessment_date | Query, tùy chọn | Ngày YYYY-MM-DD hợp lệ; bỏ qua dùng ngày server; không trước purchase_date nếu có | Ngày đánh giá không hợp lệ. |

**Response 200:**

```json
{
  "data": {
    "device_id": 3311,
    "assessed_on": "2026-09-30",
    "purchase_date": "2026-09-01",
    "warranty_months": 12,
    "warranty_expires_on": "2027-09-01",
    "warranty_status": "CON_BAO_HANH",
    "requires_approval": false
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "assessment_date": "Ngày đánh giá không được trước ngày mua."
    }
  }
}
```

HTTP 404:

```json
{
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Không tìm thấy thiết bị trong phạm vi được phép.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Read-only; không sửa trạng thái device/ticket. Thiếu ngày mua vẫn là kết quả nghiệp vụ hợp lệ 200, không phải 400/404. Hết bảo hành cũng trả 200 với HET_BAO_HANH. Nếu warranty_months cấu hình không hợp lệ trả 500 CONFIGURATION_ERROR. Endpoint chỉ phục vụ preview; không cho client dùng kết quả preview cũ để quyết định lúc tạo phiếu.

### 7.8. E08 — POST `/tickets`

**Mục đích:** Lưu thông tin tiếp nhận, phân loại, tạo phiếu và SLA.  
**Truy vết:** FR02, FR03, FR04, FR05 ↔ US02, US03, US04, US05 ↔ UC02, UC03, UC04, UC05; MUST.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
POST /api/tickets
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "customer_id": 1024,
  "device_id": 3311,
  "center_id": 2,
  "issue_desc": "Máy sạc không vào, cắm sạc báo lỗi phụ kiện",
  "category_id": 3,
  "priority": "CAO"
}
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| customer_id | Body, bắt buộc | Customer hoạt động, thuộc quyền | Không tìm thấy khách hàng. |
| device_id | Body, bắt buộc | Device hoạt động, thuộc customer_id; thuộc quyền | Thiết bị không thuộc về khách hàng được chọn. |
| center_id | Body, bắt buộc | Trung tâm tồn tại; bằng active_center_id của nhân viên | Không có quyền tiếp nhận tại trung tâm này. |
| issue_desc | Body, bắt buộc | Chuỗi trim 1–2000 ký tự | Mô tả lỗi không được để trống; tối đa 2000 ký tự. |
| category_id | Body, bắt buộc | Nhóm trong danh mục hiện hành; nhân viên chọn | Nhóm sự cố không hợp lệ. |
| priority | Body, bắt buộc | CAO hoặc TRUNG_BINH hoặc THAP; không có mặc định | Phải chọn mức ưu tiên hợp lệ. |

**Response 201:**

```json
{
  "data": {
    "ticket_id": 88231,
    "ticket_code": "BH-000231/2026",
    "customer_id": 1024,
    "device_id": 3311,
    "center_id": 2,
    "issue_desc": "Máy sạc không vào, cắm sạc báo lỗi phụ kiện",
    "category_id": 3,
    "priority": "CAO",
    "status": "MOI",
    "received_at": "2026-09-28T09:00:00+07:00",
    "due_date": "2026-09-29T09:00:00+07:00",
    "assessed_on": "2026-09-28",
    "purchase_date_snapshot": "2026-09-01",
    "warranty_months_snapshot": 12,
    "warranty_expires_on": "2027-09-01",
    "warranty_status": "CON_BAO_HANH",
    "approval_status": "KHONG_CAN",
    "approved_by": null,
    "approved_at": null,
    "approval_note": null,
    "can_proceed": true
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "priority": "Phải chọn mức ưu tiên."
    }
  }
}
```

HTTP 409:

```json
{
  "error": {
    "code": "DEVICE_OWNER_MISMATCH",
    "message": "Thiết bị không thuộc về khách hàng được chọn.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Server tính received_at, due_date, trạng thái MOI và kết quả bảo hành; không nhận các giá trị này trong body. customer/device thiếu trả 404; category_id không có trong danh mục trả 400 với fields.category_id; center tồn tại nhưng không thuộc quyền trả 403. Phiếu thiếu ngày mua vẫn 201 theo DD01 và can_proceed=false. Hết hạn 201 theo DD02. Transaction tạo log NULL→MOI; ghi created_by trong log từ principal. Header Location: `/api/tickets/88231`. Ví dụ timestamp thành công cần clock test cố định 28/09/2026 09:00, không cho client gửi received_at.

### 7.9. E09 — GET `/tickets`

**Mục đích:** Quản lý xem danh sách phiếu chưa xác minh.  
**Truy vết:** FR06 ↔ US06 ↔ UC07; MUST.  
**Vai trò được phép:** Quản lý TTBH.

**Request mẫu:**

```http
GET /api/tickets?approval_status=CHO_PHE_DUYET&page=1&size=20
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| approval_status | Query, tùy chọn | CHO_PHE_DUYET (mặc định) hoặc DA_PHE_DUYET | Bộ lọc phê duyệt không hợp lệ. |
| page, size | Query, tùy chọn | Theo quy ước pagination | Phân trang không hợp lệ. |

**Response 200:**

```json
{
  "data": [
    {
      "ticket_id": 88232,
      "ticket_code": "BH-000232/2026",
      "customer_id": 1024,
      "device_id": 3312,
      "center_id": 2,
      "warranty_status": "CHUA_XAC_MINH",
      "approval_status": "CHO_PHE_DUYET",
      "status": "MOI",
      "received_at": "2026-09-28T09:00:00+07:00",
      "due_date": "2026-09-29T09:00:00+07:00",
      "can_proceed": false
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total": 1
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "approval_status": "Chỉ chấp nhận CHO_PHE_DUYET hoặc DA_PHE_DUYET."
    }
  }
}
```

HTTP 403:

```json
{
  "error": {
    "code": "ROLE_FORBIDDEN",
    "message": "Chỉ quản lý trung tâm được xem danh sách phê duyệt.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Danh sách này chỉ phục vụ FR06, luôn giới hạn warranty_status=CHUA_XAC_MINH và center thuộc quản lý, không phải dashboard tất cả phiếu. Bộ lọc DA_PHE_DUYET là cách xem lại kết quả của cùng ngoại lệ. Sort received_at tăng dần, ticket_id tăng dần khi trùng thời gian. Không nhận assignee/technician/status sửa chữa hoặc center tùy ý. Không có phiếu: 200 data=[], total=0. Nhân viên gọi endpoint danh sách này trả 403.

### 7.10. E10 — GET `/tickets/{ticket_id}`

**Mục đích:** Đọc phiếu để xem xét phê duyệt hoặc truy lại trao đổi.  
**Truy vết:** FR06, FR08 ↔ US06, US08 ↔ UC07, UC06; MUST cho FR06; hỗ trợ SHOULD FR08.  
**Vai trò được phép:** Nhân viên tiếp nhận / Quản lý TTBH.

**Request mẫu:**

```http
GET /api/tickets/88232
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| ticket_id | Path, bắt buộc | Ticket thuộc phạm vi tài khoản | Không tìm thấy phiếu. |

**Response 200:**

```json
{
  "data": {
    "ticket_id": 88232,
    "ticket_code": "BH-000232/2026",
    "customer_id": 1024,
    "device_id": 3312,
    "center_id": 2,
    "issue_desc": "Máy không nhận sạc, khách chưa có ngày mua",
    "category_id": 3,
    "priority": "CAO",
    "status": "MOI",
    "received_at": "2026-09-28T09:00:00+07:00",
    "due_date": "2026-09-29T09:00:00+07:00",
    "assessed_on": "2026-09-28",
    "purchase_date_snapshot": null,
    "warranty_months_snapshot": 12,
    "warranty_expires_on": null,
    "warranty_status": "CHUA_XAC_MINH",
    "approval_status": "CHO_PHE_DUYET",
    "approved_by": null,
    "approved_at": null,
    "approval_note": null,
    "can_proceed": false,
    "customer": {
      "customer_id": 1024,
      "full_name": "Nguyễn Văn Minh",
      "phone": "0854141105"
    },
    "device": {
      "device_id": 3312,
      "serial_no": "356938035643810",
      "product_id": 101
    }
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "ticket_id": "Ticket_id phải là số nguyên dương."
    }
  }
}
```

HTTP 404:

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Không tìm thấy phiếu trong phạm vi được phép.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Ví dụ success dùng quản lý nên phone không che. Nhân viên cùng trung tâm đọc cùng phiếu phải nhận phone=085****105. Trả snapshot kết quả tại tiếp nhận, không tính lại theo ngày xem. Không gộp lịch sử trao đổi không giới hạn vào response; dùng E12 phân trang. Quyền đọc ở E10 không cấp quyền phê duyệt.

### 7.11. E11 — POST `/tickets/{ticket_id}/warranty-approval`

**Mục đích:** Phê duyệt ngoại lệ thiếu ngày mua.  
**Truy vết:** FR06 ↔ US06 ↔ UC07; MUST.  
**Vai trò được phép:** Quản lý TTBH.

**Request mẫu:**

```http
POST /api/tickets/88232/warranty-approval
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "note": "Cho phép tiếp tục xử lý phiếu; thông tin ngày mua chưa được xác minh."
}
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| ticket_id | Path, bắt buộc | Ticket thuộc trung tâm quản lý phụ trách | Không tìm thấy phiếu. |
| note | Body, tùy chọn | Chuỗi trim 1–1000 ký tự hoặc null; bỏ qua → null | Ghi chú phê duyệt tối đa 1000 ký tự. |

**Response 200:**

```json
{
  "data": {
    "ticket_id": 88232,
    "status": "MOI",
    "warranty_status": "CHUA_XAC_MINH",
    "approval_status": "DA_PHE_DUYET",
    "approved_by": 7,
    "approved_at": "2026-09-28T10:00:00+07:00",
    "approval_note": "Cho phép tiếp tục xử lý phiếu; thông tin ngày mua chưa được xác minh.",
    "can_proceed": true
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 403:

```json
{
  "error": {
    "code": "ROLE_FORBIDDEN",
    "message": "Chỉ quản lý trung tâm được phê duyệt phiếu.",
    "fields": {}
  }
}
```

HTTP 409:

```json
{
  "error": {
    "code": "ALREADY_APPROVED",
    "message": "Phiếu đã được phê duyệt; không ghi đè kết quả.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Body JSON có thể là {}. Chỉ nhận phiếu CHUA_XAC_MINH + CHO_PHE_DUYET + MOI trong phạm vi quản lý. Không phải phiếu cần phê duyệt hoặc không còn trạng thái MOI: 409 APPROVAL_NOT_APPLICABLE. Ticket ngoài phạm vi/không tồn tại: 404. Note sai: 400. approved_by/approved_at do server gán; client gửi chúng trả 400. Phê duyệt không đổi warranty_status thành CON_BAO_HANH, không đổi status khỏi MOI, không khởi động lại SLA và không bổ sung log chuyển trạng thái giả. Không có chức năng từ chối phê duyệt trong FR hiện có, nên không thêm action=reject.

### 7.12. E12 — GET `/tickets/{ticket_id}/communications`

**Mục đích:** Xem lịch sử trao đổi theo phiếu.  
**Truy vết:** FR08 ↔ US08 ↔ UC06; SHOULD.  
**Vai trò được phép:** Nhân viên tiếp nhận / Quản lý TTBH.

**Request mẫu:**

```http
GET /api/tickets/88231/communications?page=1&size=20
Accept: application/json
Authorization: Bearer <access_token>
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| ticket_id | Path, bắt buộc | Ticket thuộc quyền đọc | Không tìm thấy phiếu. |
| page, size | Query, tùy chọn | Theo quy ước pagination | Phân trang không hợp lệ. |

**Response 200:**

```json
{
  "data": [
    {
      "communication_id": 501,
      "ticket_id": 88231,
      "content": "Khách xác nhận máy không nhận sạc từ sáng nay.",
      "created_at": "2026-09-28T09:10:00+07:00",
      "created_by": 12
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total": 1
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "page": "Page phải là số nguyên từ 1."
    }
  }
}
```

HTTP 404:

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Không tìm thấy phiếu trong phạm vi được phép.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Sort created_at tăng dần, communication_id tăng dần khi trùng thời gian. Chưa có trao đổi: 200 data=[]; ticket không tồn tại: 404, không được trả danh sách rỗng làm lẫn hai tình huống. created_by là ID người ghi; hiển thị tên nhân viên là dependency dữ liệu tài khoản. Quyền đọc của quản lý là lựa chọn hỗ trợ truy vết theo lý do FR08, cần cập nhật bảng vai trò vì sơ đồ hiện chỉ nối UC06 với nhân viên.

### 7.13. E13 — POST `/tickets/{ticket_id}/communications`

**Mục đích:** Ghi một lần trao đổi với khách.  
**Truy vết:** FR08 ↔ US08 ↔ UC06; SHOULD.  
**Vai trò được phép:** Nhân viên tiếp nhận.

**Request mẫu:**

```http
POST /api/tickets/88231/communications
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
```

```json
{
  "content": "Khách xác nhận máy không nhận sạc từ sáng nay."
}
```

**Validation path/query/body:**

| Trường | Vị trí và bắt buộc | Kiểu / ràng buộc | Thông báo khi vi phạm |
| --- | --- | --- | --- |
| ticket_id | Path, bắt buộc | Ticket thuộc trung tâm nhân viên | Không tìm thấy phiếu. |
| content | Body, bắt buộc | Chuỗi trim 1–2000 ký tự | Nội dung trao đổi không được trống; tối đa 2000 ký tự. |

**Response 201:**

```json
{
  "data": {
    "communication_id": 501,
    "ticket_id": 88231,
    "content": "Khách xác nhận máy không nhận sạc từ sáng nay.",
    "created_at": "2026-09-28T09:10:00+07:00",
    "created_by": 12
  }
}
```

**Hai response lỗi tiêu biểu:**

HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "fields": {
      "content": "Nội dung trao đổi không được để trống."
    }
  }
}
```

HTTP 404:

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Không tìm thấy phiếu trong phạm vi được phép.",
    "fields": {}
  }
}
```

**Hành vi và ràng buộc:** Server gán communication_id, ticket_id từ path, created_at và created_by; không nhận timestamp/actor từ client. Đây là tạo bản ghi trao đổi, không gửi tin nhắn, SMS, Zalo hay email cho khách. Lưu nối tiếp, không ghi đè lịch sử; không thay đổi status/SLA. Không ràng buộc phải phê duyệt trước mới được ghi trao đổi, vì trao đổi có thể phục vụ xác minh khi đang chờ.

## 8. Các response đặc biệt cần đọc cùng FR/AC

### 8.1. FR07: phone trùng trong phạm vi → không tạo mới, hiển thị hồ sơ cũ

HTTP 409; response sau chỉ dùng khi caller có quyền đọc existing_customer. Không trả trường này khi hồ sơ ngoài phạm vi.

```json
{
  "error": {
    "code": "PHONE_ALREADY_EXISTS",
    "message": "Số điện thoại đã có hồ sơ. Hãy sử dụng hồ sơ hiện có.",
    "fields": {
      "phone": "Số điện thoại đã tồn tại."
    },
    "existing_customer": {
      "customer_id": 1024,
      "full_name": "Nguyễn Văn Minh",
      "phone": "085****105",
      "address": "Quận 10, TP. Hồ Chí Minh",
      "created_at": "2026-09-01T10:00:00+07:00"
    }
  }
}
```

### 8.2. FR04: thiếu ngày mua là kết quả kiểm tra hợp lệ

GET E07 trả HTTP 200. Không coi thiếu ngày mua là còn bảo hành.

```json
{
  "data": {
    "device_id": 3312,
    "assessed_on": "2026-09-28",
    "purchase_date": null,
    "warranty_months": 12,
    "warranty_expires_on": null,
    "warranty_status": "CHUA_XAC_MINH",
    "requires_approval": true
  }
}
```

### 8.3. FR05/FR06: tạo phiếu thiếu ngày mua

POST E08 trả HTTP 201 theo DD01. Phiếu vẫn MOI, nhưng chưa qua cổng kiểm soát để chuyển sang xử lý.

```json
{
  "data": {
    "ticket_id": 88232,
    "ticket_code": "BH-000232/2026",
    "customer_id": 1024,
    "device_id": 3312,
    "center_id": 2,
    "issue_desc": "Máy không nhận sạc, khách chưa có ngày mua",
    "category_id": 3,
    "priority": "CAO",
    "status": "MOI",
    "received_at": "2026-09-28T09:00:00+07:00",
    "due_date": "2026-09-29T09:00:00+07:00",
    "assessed_on": "2026-09-28",
    "purchase_date_snapshot": null,
    "warranty_months_snapshot": 12,
    "warranty_expires_on": null,
    "warranty_status": "CHUA_XAC_MINH",
    "approval_status": "CHO_PHE_DUYET",
    "approved_by": null,
    "approved_at": null,
    "approval_note": null,
    "can_proceed": false
  }
}
```

### 8.4. Thiết bị hết hạn theo DD02

GET E07 trả HTTP 200 với warranty_status=HET_BAO_HANH và requires_approval=false. POST E08 trả 201, approval_status=KHONG_CAN, can_proceed=true; không hứa bảo hành miễn phí. Ví dụ ngày mua 01/09/2025, 12 tháng, tiếp nhận 28/09/2026: expires_on=01/09/2026, đã hết hạn. Nếu giảng viên chọn chính sách chặn hoặc yêu cầu phê duyệt hết hạn, phải sửa DD02, schema trạng thái, UC/AC và response lỗi cùng lúc.

## 9. Ma trận quyền

| API | Nhân viên tiếp nhận | Quản lý TTBH | Chưa đăng nhập |
| --- | --- | --- | --- |
| E01 | Có, trong trung tâm | 403 | 401 |
| E02 | Có, trong trung tâm | 403 | 401 |
| E03 | Có, trong trung tâm | 403 | 401 |
| E04 | Có, trong trung tâm | 403 | 401 |
| E05 | Có, trong trung tâm | 403 | 401 |
| E06 | Có, trong trung tâm | 403 | 401 |
| E07 | Có, trong trung tâm | 403 | 401 |
| E08 | Có, trong trung tâm | 403 | 401 |
| E09 | 403 | Có, trong đơn vị phụ trách | 401 |
| E10 | Có, trong trung tâm | Có, trong đơn vị phụ trách | 401 |
| E11 | 403 | Có, trong đơn vị phụ trách | 401 |
| E12 | Có, trong trung tâm | Có, trong đơn vị phụ trách | 401 |
| E13 | Có, trong trung tâm | 403 | 401 |

Danh mục E05/E06 là dữ liệu chung; không áp dụng hạn chế trung tâm cho bản ghi danh mục. Ma trận trên không mặc định quản lý có mọi quyền của nhân viên. E10/E12 cho quản lý quyền đọc để xem xét và truy vết; không cho quản lý ghi trao đổi thay nhân viên hay tạo phiếu, vì các FR hiện có gán các thao tác đó cho nhân viên.

## 10. Bảng truy vết FR–US–UC–API và quy tắc

| FR | US | UC theo tài liệu hiện có | API | MoSCoW | Quy tắc/nguồn trực tiếp |
| --- | --- | --- | --- | --- | --- |
| FR01 | US01 | UC01 | E01 | MUST | QT-01, QT-02, QT-14, QT-15 |
| FR02 | US02 | UC02 | E03, E04, E05, E08 | MUST | QT-03; case study Mục 8 device; DD07 cho thiết bị mới |
| FR03 | US03 | UC03 | E06, E08 | MUST | Bảng 3.1 nhóm sự cố; QT-04; FR03/AC02 bắt buộc chọn priority |
| FR04 | US04 | UC04 | E05, E07, E08 | MUST | QT-05; DD05 cách tính tháng |
| FR05 | US05 | UC05 | E08 | MUST | QT-04, QT-06; Mục 8 ticket_status_log |
| FR06 | US06 | UC07 | E09, E10, E11 | MUST | QT-05, QT-14; NFR02; DD01/09 |
| FR07 | US07 | UC11 | E02 | SHOULD | QT-01, QT-02, QT-13–15 |
| FR08 | US08 | UC06 | E10, E12, E13 | SHOULD | Case study Mục 4 phát biểu chị Lan; FR08/AC01–02 |

## 11. Liên kết NFR và kiểm chứng hợp đồng

### 11.1. NFR01 — hiệu năng tra cứu

E01 là API thuộc phép đo. Báo cáo yêu cầu từ lúc người dùng gửi tra cứu đến khi hiển thị kết quả ≤1,5 giây ở ít nhất 95/100 lượt với dữ liệu mẫu 200 phiếu. **Chỉ đo thời gian HTTP API không đủ chứng minh NFR này**, vì còn render UI. Ghi cấu hình máy, số customer/device và số phiếu, cách warm-up nếu có, kết quả cho số tồn tại/không tồn tại. Contract không cam kết đã đạt ngưỡng khi chưa có mã nguồn và kết quả đo.

### 11.2. NFR02 — phê duyệt

E11: quản lý đúng phạm vi → 200; nhân viên → 403; không token → 401; quản lý ngoài phạm vi → 404. Sau mọi request bị từ chối, approval_status/approved_by/approved_at và dữ liệu phiếu phải không đổi. Thử trực tiếp HTTP API để kiểm chứng server, không chỉ kiểm nút UI bị ẩn.

### 11.3. NFR03 — đóng gói

Base URL và cấu hình phải được ghi trong README/.env.example. Sau khi chuẩn bị theo README, prototype UI/API/CSDL khởi động bằng ≤2 lệnh theo NFR03. API contract không thay thế minh chứng chạy thật. Seed phải có tài khoản/role, trung tâm, customer/device, danh mục sự cố và dữ liệu product bảo hành để luồng mẫu tái lập được.

### 11.4. Bộ tình huống kiểm chứng đề xuất cho BT3

Đây là đầu vào để sinh viên hoàn thiện test case, chưa phải kết quả chạy kiểm thử.

| Mã gợi ý | Tình huống | Kỳ vọng | Truy vết |
| --- | --- | --- | --- |
| TC01 | Tra cùng customer bằng phone chuẩn, +84, 84 và dạng có dấu cách/chấm | E01 trả cùng customer_id; phone che với nhân viên | FR01, QT-01/02/15 |
| TC02 | Phone chưa tồn tại hoặc sai định dạng | Tương ứng 404 hoặc 400; không trả hồ sơ khác | FR01/AC02 |
| TC03 | Chọn device khách khác để tạo ticket | E08 409, không tạo ticket/log, không đổi chủ | FR02/AC02, QT-03 |
| TC04 | Thiếu priority hoặc category không hợp lệ | E08 400; không tự chọn mặc định; không ghi phiếu | FR03/AC02 |
| TC05 | Còn hạn, đúng ngày hết hạn và hết hạn; cả biên cuối tháng | E07/E08 kết luận theo DD05; phân biệt ba trường hợp | FR04, QT-05 |
| TC06 | Device thiếu ngày mua | E07 200 CHUA_XAC_MINH; E08 201 MOI + CHO_PHE_DUYET + can_proceed=false | FR04/AC02, FR06/AC02, DD01 |
| TC07 | Tạo ticket CAO, THAP theo hai AC báo cáo và CAO qua Chủ nhật | SLA đúng ba mốc ở mục 5.2; tạo log NULL→MOI | FR05, QT-04/06 |
| TC08 | Phê duyệt: quản lý đúng quyền, nhân viên, không token, ngoài trung tâm | 200/403/401/404; request lỗi không đổi DB | FR06, NFR02, QT-14 |
| TC09 | Hai phê duyệt đồng thời và phê duyệt lặp | Một 200, còn lại 409; giữ actor/time của lần thành công đầu | FR06, DD09 |
| TC10 | Tạo customer mới; trùng phone chuẩn hóa; bỏ họ tên | 201; 409 + hồ sơ cũ nếu được phép; 400 | FR07/AC01–03 |
| TC11 | Ghi hai trao đổi rồi đọc; đọc ticket không tồn tại/ngoài quyền | Đúng thứ tự và actor/time; 404 cho ticket không được đọc | FR08/AC01–02 |
| TC12 | Hai tạo customer/device trùng cùng lúc; tạo ticket gặp lỗi log | UNIQUE chỉ cho một bản ghi; ticket/log rollback cùng nhau | QT-01/03/06; mục 5.3 |

Nếu thực hiện E04 theo DD07, bổ sung biến thể thiết bị mới thành công/serial trùng/sản phẩm thiếu vào TC03/TC12 và thêm AC cho FR02. Nếu chỉ giữ thiết bị seed có sẵn, ghi rõ giới hạn đó và bỏ E04, đồng thời xem lại khả năng hoàn tất FR07 từ khách mới đến tạo phiếu.

## 12. Việc sinh viên cần rà soát trước khi chốt

1. Xác nhận DD01–03: tạo phiếu chờ phê duyệt; chính sách hết hạn; phạm vi customer ở trung tâm. Không ghi những quyết định này như QT có sẵn.
2. Đối chiếu ERD cho mọi trường trong request/response, nhất là warranty_status, snapshots, approval và ticket_communication. Quy mô lõi có thể là customer, device, issue_category, ticket, ticket_status_log, ticket_communication; tài khoản/trung tâm/sản phẩm là dependency tham chiếu hoặc seed/config, phải mô tả cách cung cấp và không giấu khối lượng dữ liệu.
3. Kiểm tra `is_warranty` NOT NULL trong mô hình tham chiếu để không gán sai tình trạng CHUA_XAC_MINH. Điều chỉnh ERD như mục 4.2 trước khi code.
4. Xác nhận DD05/06: ngày biên bảo hành, Chủ nhật, giờ làm việc và lịch lễ; thêm test cụ thể nếu chọn khác bản này.
5. Bổ sung AC ghi thiết bị mới nếu dùng E04. Nêu quyền đọc lịch sử của quản lý ở bảng actor và sơ đồ/đặc tả UC nếu giữ E12 cho quản lý.
6. Chọn và hiện thực cơ chế cấp token hạ tầng, cùng seed tài khoản test; server phải có principal được xác thực, không dùng role từ body hoặc header tự khai.
7. Thay IDs/danh mục sản phẩm mẫu bằng seed thật. Các dữ liệu customer/device/product bổ sung phải được mô phỏng có phương pháp; không tuyên bố lấy từ CSV LMS khi chưa đọc CSV.
8. Giữ MoSCoW 6 MUST/2 SHOULD theo báo cáo hiện tại. Vấn đề checklist Buổi 4 yêu cầu 2–3 MUST là việc cần xác nhận với giảng viên; tài liệu này không tự đổi mức ưu tiên.
9. Commit tài liệu API cùng SRS/UC/ERD đã đồng bộ; khi chuyển thành Swagger hoặc Postman phải giữ cùng response, validation, quyền và mã lỗi.

### Khai báo sử dụng AI đề xuất

- **Công cụ:** ChatGPT/Codex.
- **Dùng vào việc gì:** hỗ trợ đối chiếu FR–US–UC với case study, soạn bản dự thảo API contract và chỉ ra các khoảng trống thiết kế.
- **Phần nào:** tài liệu API contract; không đồng nghĩa đã sinh hoặc kiểm chứng mã nguồn.
- **Đã kiểm chứng thế nào:** sinh viên điền các thao tác thực sự đã làm: đối chiếu Mục/QT, kiểm tra request/response với ERD, rà quyết định DD, gọi API và kiểm tra dữ liệu. Không khai đã chạy test khi mới có đặc tả.

Chuẩn bị vấn đáp: giải thích vì sao một POST ticket hiện thực nhiều FR, vì sao CHUA_XAC_MINH khác MOI, vì sao phê duyệt không đồng nghĩa miễn phí, vì sao SLA do server tính và vì sao quyền trung tâm phải được kiểm tra tại API.
