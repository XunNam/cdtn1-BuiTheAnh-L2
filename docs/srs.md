# MỤC LỤC

DANH MỤC BẢNG BIỂU ............................................................................................ 3

DANH MỤC TỪ VIẾT TẮT VÀ THUẬT NGỮ .......................................................... 4

1\. GIỚI THIỆU VÀ PHẠM VI ................................................................................... 5

1.1. Giới thiệu ......................................................................................................... 5

1.2. Phạm vi ............................................................................................................ 5

2\. USER STORY ......................................................................................................... 6

3\. CÁC BÊN LIÊN QUAN VÀ VAI TRÒ .................................................................. 8

4\. YÊU CẦU CHỨC NĂNG ...................................................................................... 9

4.1. FR01 ................................................................................................................. 9

4.2. FR02 ............................................................................................................... 10

4.3. FR03 ............................................................................................................... 11

4.4. FR04 ............................................................................................................... 12

4.5. FR05 ............................................................................................................... 13

4.6. FR06 ............................................................................................................... 15

4.7. FR07 ............................................................................................................... 16

4.8. FR08 ............................................................................................................... 17

5\. YÊU CẦU PHI CHỨC NĂNG ............................................................................. 19

5.1. NFR01 ............................................................................................................ 19

5.2. NFR02 ............................................................................................................ 19

5.3. NFR03 ............................................................................................................ 20

6\. BẢNG TRUY VẾT YÊU CẦU ............................................................................. 21

7\. RÀNG BUỘC VÀ QUY TẮC NGHIỆP VỤ ........................................................ 22

Trang 2

---

# DANH MỤC BẢNG BIỂU

Bảng 1 Bảng danh mục từ viết tắt và thuật ngữ ............................................................. 4

Bảng 2 Liệt kê và mô tả User Story ............................................................................... 7

Bảng 3 Mô tả vai trò và chức năng của các bên liên quan ............................................. 8

Bảng 4 Mô tả yêu cầu chức năng FR01 ......................................................................... 9

Bảng 5 Mô tả yêu cầu chức năng FR02 ....................................................................... 10

Bảng 6 Mô tả yêu cầu chức năng FR03 ....................................................................... 11

Bảng 7 Mô tả yêu cầu chức năng FR04 ....................................................................... 12

Bảng 8 Mô tả yêu cầu chức năng FR05 ....................................................................... 13

Bảng 9 Mô tả yêu cầu chức năng FR06 ....................................................................... 15

Bảng 10 Mô tả yêu cầu chức năng FR07 ..................................................................... 16

Bảng 11 Mô tả yêu cầu chức năng FR08 ...................................................................... 17

Bảng 12 Mô tả yêu cầu phi chức năng NFR01 ............................................................ 19

Bảng 13 Mô tả yêu cầu phi chức năng NFR02 ............................................................ 19

Bảng 14 Mô tả yêu cầu phi chức năng NFR03 ............................................................ 20

Trang 3

---

# DANH MỤC TỪ VIẾT TẮT VÀ THUẬT NGỮ

| Từ viết tắt/ Thuật ngữ | Tiếng Anh | Giải thích tiếng Việt |
| --- | --- | --- |
| Prototype | Prototype | Prototype (nguyên mẫu) là một mô hình thử nghiệm ban đầu của một sản phẩm, ứng dụng hoặc giao diện. Nó được tạo ra nhằm mục đích mô phỏng cách thức hoạt động, kiểm tra tính khả thi của ý tưởng và thu thập phản hồi từ người dùng trước khi tiến hành lập trình hoặc sản xuất hàng loạt |
| Smart CRM | Smart Customer Relationship Management | Smart CRM (Hệ thống quản lý quan hệ khách hàng thông minh) là phần mềm hệ thống hợp nhất dữ liệu khách hàng, số hóa quy trình bảo hành và cung cấp báo cáo điều hành |
| IMEI | International Mobile Equipment Identity | Mã số nhận dạng thiết bị di động quốc tế. Đây là một dãy gồm 15 chữ số độc nhất được nhà sản xuất gán cố định cho từng chiếc điện thoại hoặc thiết bị kết nối di động trên thế giới |
| Serial | Serial Number | Là một chuỗi mã định danh gồm các chữ cái hoặc con số duy nhất được nhà sản xuất gán cho từng sản phẩm riêng lẻ |

*Bảng 1 Bảng danh mục từ viết tắt và thuật ngữ*

Trang 4

---

# 1. GIỚI THIỆU VÀ PHẠM VI

## 1.1. Giới thiệu

- Mekong Mobile là doanh nghiệp bán lẻ điện thoại, máy tính bảng và phụ kiện, đồng thời cung cấp dịch vụ bảo hành và sửa chữa. Hiện nay, yêu cầu bảo hành được ghi nhận trên phiếu giấy, cách lưu trữ chưa thống nhất giữa các trung tâm, mô tả lỗi được ghi tự do và chưa phân nhóm. Trong định hướng số hóa quy trình bằng Smart CRM, prototype này tập trung vào luồng L2 - Tiếp nhận và phân loại yêu cầu bảo hành, nhằm chuẩn hóa thông tin tiếp nhận và tạo đầu vào rõ ràng cho bước xử lý tiếp theo.

## 1.2. Phạm vi

- Phạm vi prototype bắt đầu khi nhân viên tiếp nhận tra cứu khách hàng theo số điện thoại, ghi nhận thiết bị bằng serial/IMEI và mô tả lỗi, sau đó chọn nhóm sự cố và mức ưu tiên. Hệ thống kiểm tra tình trạng bảo hành, tự động tính hạn cam kết theo mức ưu tiên và tạo phiếu ở trạng thái “Mới”. Trường hợp thiếu ngày mua phải được đánh dấu “chưa xác minh bảo hành” và được quản lý xem xét, phê duyệt trước khi tiếp tục xử lý.

- Prototype được triển khai dưới dạng ứng dụng web chạy cục bộ cho một cá nhân thực hiện. Các chức năng phân công kỹ thuật viên, sửa chữa, quản lý linh kiện, bàn giao thiết bị và báo cáo điều hành nằm ngoài phạm vi. Trong tài liệu, “phiếu bảo hành” là bản ghi yêu cầu bảo hành hoặc sửa chữa, “hạn cam kết” là thời hạn xử lý được hệ thống tính theo quy tắc nghiệp vụ.

Trang 5

---

# 2. USER STORY

| Mã User Story | Mô tả | Là…, tôi muốn… để… | MoSCoW |
| --- | --- | --- | --- |
| US01 | Tra cứu khách hàng bằng số điện thoại | Là nhân viên tiếp nhận, tôi muốn tra cứu khách hàng theo số điện thoại để sử dụng lại thông tin khách hàng đã có và tránh tạo hồ sơ trùng. | MUST |
| US02 | Ghi nhận serial/IMEI thiết bị và mô tả lỗi | Là nhân viên tiếp nhận, tôi muốn ghi nhận thiết bị bằng số serial/IMEI và mô tả lỗi của khách hàng để xác định chính xác thiết bị và nội dung yêu cầu bảo hành. | MUST |
| US03 | Chọn nhóm sự cố và mức ưu tiên | Là nhân viên tiếp nhận, tôi muốn chọn nhóm sự cố và mức ưu tiên cho yêu cầu bảo hành để phiếu được phân loại nhất quán trước khi chuyển sang xử lý. | MUST |
| US04 | Kiểm tra tình trạng bảo hành | Là nhân viên tiếp nhận, tôi muốn kiểm tra tình trạng bảo hành của thiết bị dựa trên ngày mua và thời hạn bảo hành để xác định yêu cầu có thuộc diện bảo hành hay cần xác minh thêm. | MUST |
| US05 | Tạo phiếu và nhận hạn cam kết | Là nhân viên tiếp nhận, tôi muốn tạo phiếu bảo hành và nhận hạn cam kết được tính theo mức ưu tiên để có thời hạn xử lý rõ ràng khi tiếp nhận yêu cầu. | MUST |
| US06 | Quản lý phê duyệt phiếu chưa xác minh | Là quản lý trung tâm bảo hành, tôi muốn xem và phê duyệt các phiếu chưa xác minh được tình trạng bảo hành để kiểm soát các trường hợp thiếu ngày mua trước khi phiếu được tiếp tục xử lý. | MUST |
| US07 | Tạo khách hàng mới khi chưa tồn tại | Là nhân viên tiếp nhận, tôi muốn tạo hồ sơ khách hàng mới khi không tìm thấy số điện thoại trong hệ thống để có thể tiếp tục tiếp nhận yêu cầu bảo hành mà không phải ghi nhận thông tin ngoài hệ thống. | SHOULD |
| US08 | Ghi nhận lịch sử trao đổi với khách | Là nhân viên tiếp nhận, tôi muốn ghi nhận lịch sử trao đổi với khách theo từng phiếu, kèm thời điểm và người thực hiện, để có thể truy lại đầy đủ nội dung đã trao đổi khi cần xác minh. | SHOULD |

Trang 6

---

*Bảng 2 Liệt kê và mô tả User Story*

Trang 7

---

# 3. CÁC BÊN LIÊN QUAN VÀ VAI TRÒ

| Vai trò | Mô tả | Chức năng và giới hạn |
| --- | --- | --- |
| Khách hàng | Yêu cầu bảo hành; cung cấp số điện thoại, thiết bị, mô tả lỗi và thông tin mua hàng để xác minh tình trạng bảo hành. | Tham gia nghiệp vụ thông qua nhân viên tiếp nhận; được thông báo kết quả tiếp nhận và hạn cam kết. Chưa có chức năng đăng nhập hoặc trực tiếp tạo, phân loại hay phê duyệt phiếu bảo hành. |
| Nhân viên tiếp nhận | Ghi nhận và phân loại yêu cầu bảo hành, bảo đảm thông tin đầu vào đầy đủ và phù hợp quy tắc nghiệp vụ. | Tra cứu khách hàng theo số điện thoại; ghi nhận serial/IMEI và mô tả lỗi; chọn nhóm sự cố, mức ưu tiên; xem kết quả kiểm tra bảo hành; tạo phiếu ở trạng thái “Mới” và nhận hạn cam kết do hệ thống tính. Trường hợp thiếu ngày mua phải được đánh dấu “chưa xác minh bảo hành” và chuyển cho quản lý xem xét. |
| Quản lý trung tâm bảo hành | Kiểm soát trường hợp chưa xác minh được tình trạng bảo hành, đặc biệt khi thiếu ngày mua. | Xem thông tin phiếu chưa xác minh và thực hiện phê duyệt theo phạm vi đã chọn. Các chức năng phân công kỹ thuật viên, quản lý sửa chữa và báo cáo điều hành nằm ngoài prototype của luồng L2. |

*Bảng 3 Mô tả vai trò và chức năng của các bên liên quan*

Trang 8

---

# 4. YÊU CẦU CHỨC NĂNG

## 4.1. FR01

| Mã yêu cầu | FR01 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống phải cho phép nhân viên tiếp nhận tra cứu khách hàng theo số điện thoại và hiển thị hồ sơ khách hàng đã tồn tại tương ứng với số điện thoại đó |
| User Story liên quan | US01 - Tra cứu khách hàng bằng số điện thoại |
| MoSCoW | MUST – Bắt buộc có |
| Lý do ưu tiên | Tra cứu khách hàng là bước đầu vào của luồng tiếp nhận và giúp tuân thủ quy tắc tránh tạo hồ sơ trùng |

*Bảng 4 Mô tả yêu cầu chức năng FR01*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Số điện thoại 0854141105 đã có trong hệ thống

    - When: Nhân viên tiếp nhận tra cứu bằng số điện thoại này

    - Then: Hệ thống hiển thị đúng hồ sơ khách hàng tương ứng

  - AC02:

    - Given: Số điện thoại 0854141105 chưa có trong hệ thống

    - When: Nhân viên tiếp nhận tra cứu bằng số điện thoại này

    - Then: Hệ thống thông báo “Không tìm thấy khách hàng” và không hiển thị hồ sơ của khách hàng khác

Trang 9

---

## 4.2. FR02

| Mã yêu cầu | FR02 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống phải cho phép nhân viên tiếp nhận ghi nhận thiết bị bằng số serial/IMEI, liên kết thiết bị với khách hàng đang tiếp nhận và nhập mô tả lỗi của khách hàng để làm thông tin đầu vào cho phiếu bảo hành |
| User Story liên quan | US02 - Ghi nhận serial/IMEI thiết bị và mô tả lỗi |
| MoSCoW | MUST – Bắt buộc có |
| Lý do ưu tiên | Thiết bị và mô tả lỗi là thông tin đầu vào cần thiết để phân loại yêu cầu và tạo phiếu bảo hành trong luồng L2 |

*Bảng 5 Mô tả yêu cầu chức năng FR02*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Nhân viên đã chọn khách hàng và thiết bị có serial/IMEI thuộc về khách hàng đó

    - When: Nhân viên chọn thiết bị và nhập mô tả lỗi không để trống

    - Then: Hệ thống ghi nhận đúng thiết bị và mô tả lỗi vào thông tin tiếp nhận để sử dụng khi tạo phiếu bảo hành

  - AC02:

    - Given: Serial/IMEI đã tồn tại và thiết bị đang thuộc về một khách hàng khác với khách hàng được chọn

    - When: Nhân viên sử dụng serial/IMEI này để ghi nhận thiết bị cho yêu cầu đang tiếp nhận

    - Then: Hệ thống từ chối liên kết thiết bị, thông báo “Thiết bị không thuộc về khách hàng được chọn” và giữ nguyên thông tin chủ sở hữu hiện tại

Trang 10

---

## 4.3. FR03

| Mã yêu cầu | FR03 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống phải cho phép nhân viên tiếp nhận chọn nhóm sự cố từ danh mục có sẵn và chọn một mức ưu tiên CAO, TRUNG BINH hoặc THAP cho yêu cầu bảo hành; ghi \_ nhận các lựa chọn này vào thông tin tiếp nhận để sử dụng khi tạo phiếu |
| User Story liên quan | US03 - Chọn nhóm sự cố và mức ưu tiên |
| MoSCoW | MUST – Bắt buộc có |
| Lý do ưu tiên | Phiếu bảo hành cần được phân loại mức độ ưu tiên để hệ thống có thể tính thời hạn cam kết theo quy tắc nghiệp vụ QT-04 |

*Bảng 6 Mô tả yêu cầu chức năng FR03*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Nhân viên đang tiếp nhận yêu cầu bảo hành và hệ thống có danh mục nhóm sự cố

    - When: Nhân viên chọn một nhóm sự cố trong danh mục và mức ưu tiên CAO, TRUNG\_BINH hoặc THAP

    - Then: Hệ thống ghi nhận đúng nhóm sự cố và mức ưu tiên đã chọn vào thông tin tiếp nhận để sử dụng khi tạo phiếu bảo hành

  - AC02:

    - Given: Nhân viên đang tiếp nhận yêu cầu bảo hành và hệ thống có danh mục nhóm sự cố

    - When: Nhân viên tạo phiếu bảo hành mà không thực hiện chọn mức ưu tiên

    - Then: Hệ thống hiển thị thông báo yêu cầu phải chọn mức ưu tiên và không tạo phiếu bảo hành

Trang 11

---

## 4.4. FR04

| Mã yêu cầu | FR04 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống phải xác định tình trạng bảo hành của thiết bị dựa trên ngày tiếp nhận, ngày mua và số tháng bảo hành của sản phẩm. Nếu thiếu ngày mua, hệ thống phải đánh dấu yêu cầu “chưa xác minh bảo hành” và yêu cầu quản lý phê duyệt |
| User Story liên quan | US04 - Kiểm tra tình trạng bảo hành |
| MoSCoW | MUST – Bắt buộc có |
| Lý do ưu tiên | Hệ thống cần xác nhận tình trạng bảo hành theo quy tắc nghiệp vụ QT-05 |

*Bảng 7 Mô tả yêu cầu chức năng FR04*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Thiết bị có ngày mua 01/09/2026, thời hạn bảo hành 12 tháng và ngày tiếp nhận là 30/09/2026

    - When: Nhân viên thực hiện kiểm tra tình trạng bảo hành

    - Then: Hệ thống xác định và hiển thị thiết bị “Còn bảo hành”

  - AC02:

    - Given: Thiết bị chưa có thông tin ngày mua

    - When: Nhân viên thực hiện kiểm tra tình trạng bảo hành

    - Then: Hệ thống đánh dấu yêu cầu “Chưa xác minh bảo hành”, thông báo cần phê duyệt bởi quản lý và không tự kết luận thiết bị còn bảo hành

Trang 12

---

## 4.5. FR05

| Mã yêu cầu | FR05 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống phải cho phép nhân viên tiếp nhận tạo phiếu bảo hành từ thông tin tiếp nhận hợp lệ, ghi nhận thời điểm tiếp nhận, đặt trạng thái ban đầu là “Mới” và tự động tính hạn cam kết theo mức ưu tiên: CAO = 24 giờ, TRUNG BINH \_ = 72 giờ, THAP = 120 giờ, chỉ tính ngày làm việc từ thứ Hai đến thứ Bảy |
| User Story liên quan | US05 - Tạo phiếu và nhận hạn cam kết |
| MoSCoW | MUST – Bắt buộc có |
| Lý do ưu tiên | Hệ thống tính hạn theo mức ưu tiên và đưa ra hạn cam kết tuân thủ quy tắc nghiệp vụ QT-04 |

*Bảng 8 Mô tả yêu cầu chức năng FR05*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Thông tin tiếp nhận hợp lệ, thiết bị đã được xác định còn bảo hành, mức ưu tiên là CAO và thời điểm tiếp nhận là 09:00 thứ Hai, ngày 28/09/2026

    - When: Nhân viên xác nhận tạo phiếu bảo hành

    - Then: Hệ thống lưu phiếu ở trạng thái “Mới”, ghi nhận thời điểm tiếp nhận và sinh hạn cam kết là 09:00 thứ Ba, ngày 29/09/2026

  - AC02:

    - Given: Thông tin tiếp nhận hợp lệ, thiết bị đã được xác định còn bảo hành, mức ưu tiên là THAP và thời điểm tiếp nhận là 09:00 thứ Hai, ngày 28/09/2026

    - When: Nhân viên xác nhận tạo phiếu bảo hành

Trang 13

---

- Then: Hệ thống lưu phiếu ở trạng thái “Mới”, ghi nhận thời điểm tiếp nhận và sinh hạn cam kết là 09:00 thứ Bảy, ngày 03/10/2026

Trang 14

---

## 4.6. FR06

| Mã yêu cầu | FR06 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống phải cho phép quản lý trung tâm bảo hành xem thông tin các phiếu được đánh dấu “chưa xác minh bảo hành” do thiếu ngày mua và thực hiện phê duyệt để cho phép phiếu tiếp tục được xử lý |
| User Story liên quan | US06 - Quản lý phê duyệt phiếu chưa xác minh |
| MoSCoW | MUST – Bắt buộc có |
| Lý do ưu tiên | Hoàn thiện ngoại lệ thiếu ngày mua và đáp ứng yêu cầu quản lý phê duyệt theo quy tắc nghiệp vụ QT-05 |

*Bảng 9 Mô tả yêu cầu chức năng FR06*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Một phiếu được đánh dấu “chưa xác minh bảo hành” do thiếu ngày mua và chưa được phê duyệt

    - When: Quản lý trung tâm xem thông tin phiếu và xác nhận phê duyệt

    - Then: Hệ thống ghi nhận phiếu đã được quản lý phê duyệt và cho phép phiếu tiếp tục được xử lý

  - AC02:

    - Given: Một phiếu được đánh dấu “chưa xác minh bảo hành” do thiếu ngày mua và chưa được phê duyệt

    - When: Nhân viên yêu cầu tiếp tục xử lý phiếu

    - Then: Hệ thống không cho phép tiếp tục xử lý và thông báo “Phiếu cần được quản lý phê duyệt”

Trang 15

---

## 4.7. FR07

| Mã yêu cầu | FR07 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống cho phép nhân viên tiếp nhận tạo hồ sơ khách hàng mới khi số điện thoại chưa tồn tại trong hệ thống. Hồ sơ phải có họ tên và số điện thoại, số điện thoại được chuẩn hóa trước khi lưu và không được trùng với hồ sơ hiện có. |
| User Story liên quan | US07 - Tạo khách hàng mới khi chưa tồn tại |
| MoSCoW | SHOULD - Nên có |
| Lý do ưu tiên | Chức năng này xử lý trường hợp khách hàng chưa có hồ sơ và giúp quy trình tiếp nhận không bị gián đoạn. |

*Bảng 10 Mô tả yêu cầu chức năng FR07*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Số điện thoại của khách hàng sau khi chuẩn hóa chưa tồn tại trong hệ thống

    - When: Nhân viên tiếp nhận nhập đầy đủ họ tên, số điện thoại và thực hiện tạo hồ sơ khách hàng

    - Then: Hệ thống tạo hồ sơ khách hàng mới thành công và cho phép nhân viên tiếp tục quy trình tiếp nhận bảo hành

  - AC02:

    - Given: Số điện thoại của khách hàng sau khi chuẩn hóa đã tồn tại trong hệ thống

    - When: Nhân viên tiếp nhận thực hiện tạo hồ sơ khách hàng mới với số điện thoại đó

    - Then: Hệ thống không tạo hồ sơ mới và hiển thị hồ sơ khách hàng đã tồn tại để nhân viên sử dụng

Trang 16

---

- AC03:

    - Given: Nhân viên đang tạo hồ sơ khách hàng mới

    - When: Nhân viên bỏ trống họ tên hoặc số điện thoại và thực hiện lưu

    - Then: Hệ thống từ chối lưu hồ sơ và thông báo trường bắt buộc còn thiếu

## 4.8. FR08

| Mã yêu cầu | FR08 |
| --- | --- |
| Yêu cầu chức năng | Hệ thống cho phép nhân viên tiếp nhận ghi nhận lịch sử trao đổi với khách hàng theo từng phiếu bảo hành, trong đó mỗi lần trao đổi phải lưu nội dung, thời điểm và người thực hiện để có thể truy lại khi cần xác minh. |
| User Story liên quan | US08 - Ghi nhận lịch sử trao đổi với khách |
| MoSCoW | SHOULD - Nên có |
| Lý do ưu tiên | Việc lưu lịch sử trao đổi giúp nhân viên và quản lý truy vết thông tin khi phát sinh xác minh hoặc tranh chấp, thay vì phụ thuộc vào ghi chú tự do hoặc trí nhớ. |

*Bảng 11 Mô tả yêu cầu chức năng FR08*

- Tiêu chí chấp nhận (Acceptance Criteria):

  - AC01:

    - Given: Một phiếu bảo hành đã tồn tại trong hệ thống

    - When: Nhân viên tiếp nhận nhập nội dung trao đổi với khách và thực hiện lưu

    - Then: Hệ thống lưu nội dung trao đổi vào đúng phiếu bảo hành, đồng thời ghi nhận thời điểm và người thực hiện

Trang 17

---

- AC02:

    - Given: Phiếu bảo hành đã có nhiều lần trao đổi với khách

    - When: Nhân viên tiếp nhận xem lịch sử trao đổi của phiếu

    - Then: Hệ thống hiển thị các lần trao đổi kèm nội dung, thời điểm và người thực hiện để có thể truy lại quá trình trao đổi

Trang 18

---

# 5. YÊU CẦU PHI CHỨC NĂNG

## 5.1. NFR01

| Mã yêu cầu | NFR01 |
| --- | --- |
| Phân loại | Hiệu năng |
| Yêu cầu phi chức năng | Khi chạy cục bộ với 200 phiếu bảo hành, thời gian từ lúc nhân viên gửi yêu cầu tra cứu số điện thoại đến khi hiển thị kết quả phải dưới 1,5 giây trong ít nhất 95% lượt tra cứu. Ghi rõ cấu hình của máy thực hiện kiểm thử trong báo cáo |
| Cách kiểm chứng | Thực hiện 100 lần tra cứu, gồm số điện thoại tồn tại và không tồn tại, ít nhất 95 lần tra cứu phải hiển thị kết quả tra cứu dưới 1,5 giây |

*Bảng 12 Mô tả yêu cầu phi chức năng NFR01*

## 5.2. NFR02

| Mã yêu cầu | NFR02 |
| --- | --- |
| Phân loại | Bảo mật |
| Yêu cầu phi chức năng | Chỉ tài khoản có vai trò Quản lý trung tâm bảo hành được phê duyệt các phiếu chưa xác minh bảo hành. 100% yêu cầu phê duyệt từ tài khoản không có quyền hoặc chưa đăng nhập phải bị từ chối, và dữ liệu phê duyệt không được thay đổi |
| Cách kiểm chứng | Gọi trực tiếp API phê duyệt (sử dụng POST thông qua Postman hoặc các công cụ có chức năng tương tự) với trạng thái đăng nhập tài khoản quản lý, đăng nhập tài khoản nhân viên tiếp nhận và khi chưa đăng nhập. Kiểm tra phản hồi và dữ liệu trước và sau khi gọi API. |

*Bảng 13 Mô tả yêu cầu phi chức năng NFR02*

Trang 19

---

## 5.3. NFR03

| Mã yêu cầu | NFR03 |
| --- | --- |
| Phân loại | Phân phối và cài đặt |
| Yêu cầu phi chức năng | Trên máy đã cài Docker và Docker Compose, sau khi tải mã nguồn và chuẩn bị cấu hình theo README, toàn bộ prototype gồm giao diện, API và CSDL phải khởi động thành công mà không thực hiện quá 2 lệnh. Không yêu cầu cài riêng Node.js hoặc PostgreSQL trên máy kiểm chứng |
| Cách kiểm chứng | Dựng prototype từ một môi trường sạch, thực hiện đúng README và kiểm tra hoàn thành được một lượt tiếp nhận, tạo phiếu bảo hành. |

*Bảng 14 Mô tả yêu cầu phi chức năng NFR03*

Trang 20

---

# 6. BẢNG TRUY VẾT YÊU CẦU

| Mã FR | Yêu cầu chức năng | User Story | Use Case | MoSCoW | Test case (BT3) |
| --- | --- | --- | --- | --- | --- |
| FR01 | Tra cứu khách hàng bằng số điện thoại | US01 | UC01 | MUST |  |
| FR02 | Ghi nhận serial/IMEI thiết bị và mô tả lỗi | US02 | UC02 | MUST |  |
| FR03 | Chọn nhóm sự cố và mức ưu tiên | US03 | UC03 | MUST |  |
| FR04 | Kiểm tra tình trạng bảo hành | US04 | UC04 | MUST |  |
| FR05 | Tạo phiếu và nhận hạn cam kết | US05 | UC05 | MUST |  |
| FR06 | Quản lý phê duyệt phiếu chưa xác minh | US06 | UC07 | MUST |  |
| FR07 | Tạo khách hàng mới khi chưa tồn tại | US07 | UC11 | SHOULD |  |
| FR08 | Ghi nhận lịch sử trao đổi với khách | US08 | UC06 | SHOULD |  |

Trang 21

---

# 7. RÀNG BUỘC VÀ QUY TẮC NGHIỆP VỤ

- Các quy tắc nghiệp vụ liên quan đến luồng L2:

  - QT-01: Số điện thoại khách hàng là duy nhất trong hệ thống. Khi nhập một số đã tồn tại, hệ thống phải hiển thị hồ sơ có sẵn thay vì tạo hồ sơ mới.

  - QT-02: Số điện thoại được chuẩn hóa về dạng 10 chữ số bắt đầu bằng 0 trước khi lưu. Các dạng +84…, 84…, có dấu cách hoặc dấu chấm đều phải quy về dạng chuẩn.

  - QT-03: Thiết bị được xác định duy nhất bằng số serial hoặc IMEI. Một thiết bị chỉ thuộc về một khách hàng tại một thời điểm.

  - QT-04: Hạn cam kết được sinh tự động từ thời điểm tiếp nhận theo mức ưu tiên: CAO = 24 giờ, TRUNG\_BINH = 72 giờ, THAP = 120 giờ. Chỉ tính ngày làm việc (thứ Hai đến thứ Bảy).

  - QT-05: Thiết bị được coi là còn bảo hành nếu (ngày tiếp nhận − ngày mua) ≤ số tháng bảo hành của sản phẩm. Nếu không có ngày mua, phiếu phải được đánh dấu "chưa xác minh bảo hành" và cần quản lý phê duyệt.

  - QT-06: Phiếu chỉ được chuyển trạng thái theo đúng vòng đời ở Hình 6.2. Không được quay lại trạng thái trước. Mọi lần chuyển trạng thái đều phải ghi vào ticket\_status\_log.

  - QT-13: Không được xóa vật lý phiếu bảo hành, đơn hàng hay hồ sơ khách hàng. Chỉ đánh dấu ngừng sử dụng (soft delete) và giữ nguyên lịch sử.

  - QT-14: Nhân viên chỉ xem được dữ liệu của trung tâm hoặc cửa hàng mình làm việc. Quản lý xem được toàn bộ đơn vị mình phụ trách. Ban giám đốc xem được toàn công ty.

  - QT-15: Số điện thoại khách hàng hiển thị dạng che (ví dụ 090\*\*\*\*567) với mọi vai trò trừ Quản lý và Ban giám đốc.

Trang 22
