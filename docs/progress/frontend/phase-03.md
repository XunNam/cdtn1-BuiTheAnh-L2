# FE-03 — Khách hàng và thiết bị trong màn hình tiếp nhận

Ngày thực hiện: **25/10/2026**. Trạng thái: **HOÀN THÀNH phạm vi FE-03**. **FE-04–07 chưa bắt đầu**.

## 1. Phạm vi và căn cứ

Sinh viên giao tiếp tục FE-03 theo [lộ trình](../../plans/frontend-l2-implementation-plan.md) sau [FE-02](phase-02.md), rồi yêu cầu kiểm tra và hoàn tất phần bị gián đoạn do hạn mức credit. Mã FE-03 và các ảnh/kết quả kiểm thử đã lưu trước gián đoạn; lượt tiếp tục đã kiểm tra lại mã, chạy lại các kiểm tra liên quan và hoàn tất hồ sơ bàn giao.

- **DESIGN:** [Đặc tả màn hình](../../plans/frontend-l2-screen-spec.md) — Mục6.1/6.2: khách hàng và thiết bị cùng WF02; raw phone riêng kết quả masked; serial exact; phân trang server; đổi lựa chọn phải xóa dữ liệu cũ.
- **DESIGN:** [API Contract](../../api-contract-l2.md) — Mục7.1–7.5, E01–E05; [phụ lục](../../api-contract-l2-extension.md) — validation text và AC E04/E05; [decision log](../backend/decision-log.md) — DD07. Ghi nhận thiết bị mới và danh mục sản phẩm là thiết kế đã được sinh viên chấp thuận, không phải quy tắc nguồn mới.
- **Truy vết theo baseline:** FR01/02/07 → US01/02/07 → UC01/02/11 → E01–E05; QT-01/02/03/14/15 theo mapping của contract. E05 là dependency dữ liệu, không xây module quản lý sản phẩm. Không bổ sung FR/US/UC/QT.
- **IMPLEMENTATION:** đối chiếu client/DTO, backend customer/device validation/service và helper UI hiện có. Backend tiếp tục kiểm chuẩn hóa/UNIQUE/quyền/owner/ngày mua/tháng bảo hành; frontend chỉ hỗ trợ nhập và hiển thị.

**Không cần thay API.** Không sửa contract, SRS, schema, migration, config demo, seed, credential hoặc dependency. Duy nhất helper kiểm thử backend được mở rộng fixture, nêu tại Mục3. Không truy cập/sửa Figma trong lượt tiếp tục; dùng đặc tả WF02 đã lưu trong kế hoạch.

## 2. Đã thực hiện

| File/thành phần | Nội dung |
| --- | --- |
| `src/frontend/src/components/screens/intake-screen.tsx` | Khách/thiết bị cùng màn hình; vùng phân loại kế thừa mở khi chọn đủ; phiên bản lựa chọn loại draft/preview cũ và ngăn callback cũ điều hướng sai |
| `components/intake/customer-section.tsx` | Lookup E01, tạo inline E02, phone raw/masked riêng, lỗi field/focus, chống response lookup cũ,409 đúng scope, phục hồi GET sau POST mất phản hồi |
| `components/intake/device-section.tsx` | E03 phân trang10 bản ghi, tra serial exact; E04 tạo/chọn thiết bị, chủ sở hữu đúng customer, ngày mua nullable, xử lý trùng cùng/khác chủ và phục hồi GET |
| `components/intake/product-picker.tsx` | E05 phân trang20 bản ghi, chọn được sản phẩm sau bản ghi100; giữ lựa chọn khi đổi trang; loading/empty/error/retry độc lập |
| `components/intake/form-feedback.tsx` và `src/lib/intake-validation.ts` | Lỗi gần field, whitelist field400, kiểm Unicode/code point/phone/serial/ngày lịch; phân biệt kết quả ghi chưa xác định |
| `src/frontend/src/lib/api-client.ts` | Tham số page/size/serial cho E03, page/size cho E05; decode `existing_device` chỉ trong409 `SERIAL_ALREADY_EXISTS` |
| `src/frontend/src/components/legacy/intake-forms.tsx` | Bỏ hai form khách/thiết bị đã được thay thế; giữ form phân loại/tạo phiếu cho FE-04 |
| `src/frontend/app/globals.css` | Bố cục hai cột từ1280px, một cột ở màn hình nhỏ, form/action/chuỗi dài không tràn ngang |
| Frontend tests, helper UI và docs | Thêm kiểm chứng FE-03, giữ assertion regression, chuyển output mới sang phase-03; cập nhật README/kiến trúc/kế hoạch/TD-17 |

Các đường dẫn `components/intake/` trong bảng tính từ `src/frontend/src/`.

### Hành vi chính

1. Nhập phone và chủ động tra cứu; thiếu/sai dữ liệu bị chặn. Không tìm thấy mới mở form tạo, giữ phone đã tra. Kết quả backend đã che được hiển thị riêng, không dùng chuỗi masked để gửi E02. Tên/địa chỉ được giữ khi server từ chối.
2. Sửa phone làm mất hiệu lực khách/thiết bị đã chọn. Request lookup trước trả muộn không ghi đè số mới. E02 có ref/state chặn gửi lặp;409 chỉ chọn hồ sơ nếu API cung cấp `existing_customer`, không dò hồ sơ ngoài scope.
3. E03/E05 dùng page/size/meta từ server; không coi trang đầu hoặc100 bản ghi là toàn bộ danh mục. Catalog lỗi/rỗng không ngăn chọn thiết bị đã có. Thiết bị trả về phải có đúng customer_id hiện tại.
4. Serial sau trim được giữ nguyên case/số0/Unicode; không ép kiểu số hoặc áp điều kiện IMEI15 chữ số cho mọi thiết bị. Ngày mua để trống gửi null; giá trị ngày phải đúng lịch. Server xác nhận ngày tương lai theo đồng hồ nghiệp vụ. Không nhận tháng bảo hành tùy ý từ người nhập.
5. Serial trùng cùng chủ và có DTO hợp lệ thì chọn bản ghi hiện có. Khác chủ chỉ báo lỗi, không đổi owner hoặc hiển thị hồ sơ ngoài quyền. Thiết bị đã chọn hiển thị ngày mua/tháng bảo hành chỉ đọc và tên chủ lấy từ customer đang chọn.
6. E02/E04 mất phản hồi hoặc lỗi khiến chưa xác định kết quả ghi: giữ input, chặn gửi thêm và hướng dẫn tra GET theo phone/serial. Không tự POST lại. Kiểm thử đã cho API thật commit rồi ngắt phản hồi để xác nhận không ghi lặp.
7. Đổi khách, đổi/bỏ chọn thiết bị hoặc tra thiết bị khác sẽ xóa draft/preview cũ. Vùng phân loại vẫn dùng form kế thừa; không tuyên bố đã hoàn tất FE-04.

## 3. Quyết định kỹ thuật và phạm vi thay đổi

- Tách CustomerSection/DeviceSection/ProductPicker để mỗi vùng có trạng thái tải/lỗi riêng; dùng hook/client hiện có, không thêm thư viện form/state/UI.
- Ref generation bảo vệ tác vụ bất đồng bộ theo dữ liệu nhập; version phiên của API client FE-01 tiếp tục bảo vệ theo phiên đăng nhập. Hai lớp giải quyết hai trường hợp khác nhau. Đổi lựa chọn remount form phân loại để bỏ preview cũ.
- Kiểm Unicode đếm code point, chặn NUL/surrogate lẻ và không normalize chuỗi. Không dựa vào HTML maxLength theo UTF-16. Ngày tương lai để backend quyết định; helper frontend không lấy ngày máy làm luật.
- Thông báo lỗi400 được gắn field;409 chỉ sử dụng hồ sơ đã decode do server trả. GET có thể thử lại; POST không tự thử lại khi kết quả chưa xác định.
- `src/backend/scripts/ui-test.ts` bổ sung101 sản phẩm test vào cấu hình trong RAM, tạo tổng104 sản phẩm active trong fixture; có lệnh điều khiển filesystem để restart với catalog all-inactive. Không thêm HTTP endpoint hoặc sửa config/seed thật. Browser tự ghi105 thiết bị vào schema test để kiểm11 trang E03. Đây là mở rộng hạ tầng kiểm chứng FE-03, không sửa backend production.
- Giữ nguyên auth/login, routing, quyền backend và các form danh sách/chi tiết/phê duyệt/trao đổi. Ghi nhận hoàn thiện frontend tại [TD-17](../../thay-doi-thiet-ke.md).

## 4. Kiểm chứng thực tế

Các lệnh chạy từ root project. Sau gián đoạn chỉ sửa tài liệu; mã frontend/helper test giữ bản đã build thành công trước gián đoạn.

| Kiểm chứng | Kết quả | Bằng chứng/giới hạn |
| --- | --- | --- |
| Baseline frontend typecheck và test trước FE-03 | PASS |22 test kế thừa FE-02 |
| `npm --prefix src/frontend run typecheck` | PASS | Đã xác nhận lại trong lượt tiếp tục |
| `npm --prefix src/frontend run lint` | PASS | Đã xác nhận lại, không bỏ rule |
| `npm --prefix src/frontend test` | PASS |29/29,0 fail/skip;22 regression +7 nhóm FE-03 |
| `npm --prefix src/backend run typecheck` | PASS | Helper UI test vẫn đúng kiểu; đã xác nhận lại |
| `npm --prefix src/frontend run build` | PASS | Bản mã cuối trước gián đoạn,9 route; không đổi code sau build |
| `npm run test:ui` | PASS | Lượt xác nhận cuối20/20 trong45,9 giây, Next production/Express/PostgreSQL thật |
| Dữ liệu public trước/sau UI | PASS | Harness trả `UI_FIXTURE_PUBLIC_PRESERVED`; chỉ tạo/dọn schema test riêng |
| Responsive/ảnh thật | PASS trong phạm vi FE-03 | Assertion không tràn ngang1920/1280/768/375px; đã xem ảnh desktop/mobile, catalog rỗng và phân trang |
| Toàn `npm test` root/backend suite đầy đủ | NOT RUN trong FE-03 | Chạy backend typecheck và UI tích hợp liên quan, không tuyên bố chạy toàn suite |
| Docker/clean-room/NFR03 | NOT RUN trong FE-03 | Không suy từ UI local thành kết quả container |

Lượt tiếp tục có lỗi khởi tạo môi trường chạy lệnh thông thường (`0x80070020`); các lệnh đọc/kiểm tra đã chạy thành công với quyền phù hợp được công cụ xét duyệt. Không hạ validation hoặc sửa cấu hình để né lỗi.

### Client/unit —7 nhóm mới

- F-U23/24: E03 serial exact/encoding/page/size; E05 trang sau100 theo metadata.
- F-U25/26:409 `existing_device` đúng DTO, không đoán field hoặc nhận hồ sơ khác chủ.
- F-U27: phone raw/chuẩn hóa, biên1–30 và dữ liệu không hợp lệ.
- F-U28: tên1–120, địa chỉ tối đa255 theo code point, whitespace/NUL/surrogate.
- F-U29: serial1–50 giữ case/số0, ngày nullable và ngày lịch hợp lệ; không phụ thuộc ngày máy.

### Browser —8 kịch bản FE-03 và12 regression

| Mã | Đã kiểm với API thật |
| --- | --- |
| FE03-UI01 | Lookup/create inline, field/focus, phone raw khác masked, giữ dữ liệu lỗi |
| FE03-UI02 |409 phone cùng scope chọn hồ sơ; ngoài scope không lộ profile |
| FE03-UI03 | Ngày tương lai400, serial409 cùng/khác chủ, serial exact giữ case/số0 |
| FE03-UI04 | Đọc đủ105 thiết bị qua11 trang; E05 trang6, quay lại trang1 giữ lựa chọn; tháng bảo hành do server cấp |
| FE03-UI05 | Sửa phone lúc lookup chậm, response cũ không thay customer/device/preview mới |
| FE03-UI06 | Lỗi mạng/cấu hình test catalog rỗng; thiết bị có sẵn vẫn chọn được |
| FE03-UI07 | Commit POST thật rồi mất response; phục hồi GET E02/E04; mỗi thao tác chỉ1 POST |
| FE03-UI08 | Biên Unicode tên/địa chỉ/serial, serial50 emoji được server nhận; responsive4 viewport |

12 regression giữ luồng tạo phiếu/trao đổi/duyệt, loading/empty/error/retry, scope/401, phiên RAM/route/Back và6 case login FE-02. Điều chỉnh selector theo vùng phân loại vì nhiều trạng thái tải/lỗi nay độc lập; không bỏ assertion nghiệp vụ.

NFR01 local kế thừa: đo click→DOM trên fixture200 phiếu,1 warm-up và100 mẫu;100/100 dưới1500ms, p95≈47,9ms, max≈48,2ms. Đây là regression local, không nghiệm thu toàn FE-07. [Raw kết quả](../../tests/frontend/phase-03/nfr01-local.json) có timestamp/môi trường và từng mẫu.

## 5. Minh chứng và bảo toàn

Xem [tổng hợp minh chứng](../../tests/frontend/phase-03/verification.md), [desktop1280](../../tests/frontend/phase-03/intake-1280.png), [mobile375](../../tests/frontend/phase-03/intake-375.png), [phân trang](../../tests/frontend/phase-03/intake-pagination.png), [catalog rỗng](../../tests/frontend/phase-03/intake-empty-catalog.png) và [phục hồi kết quả ghi](../../tests/frontend/phase-03/intake-recovered.png).

[File audit](../../tests/frontend/phase-03/file-audit.json) so SHA-256 với snapshot filesystem trước FE-03, phân biệt backend production và helper test. Contract/SRS/schema, dependency, auth/login và evidence các phase cũ được bảo toàn. Không Git/commit/push; không sửa tài liệu nguồn hoặc khai báo AI. Audit là đối chiếu tập tệp đã snapshot, không phải kết quả quét bảo mật toàn repository.

## 6. Giới hạn và điểm dừng

Hoàn thành FE-03; không tự triển khai FE-04. Bố cục phân loại/bảo hành/tạo phiếu, xác nhận sau201 và phục hồi POST E08 vẫn cần thực hiện ở FE-04 theo kế hoạch. Phê duyệt/trao đổi/danh sách còn kế thừa và sẽ hoàn thiện ở các phase tương ứng.

Không xây CRUD quản trị khách/thiết bị/sản phẩm hoặc API đổi chủ. Phục hồi GET sau mất phản hồi giảm nguy cơ gửi lặp nhưng không bổ sung idempotency API. Test mô phỏng mất kết nối bằng ngắt request/response thật; không tuyên bố kiểm chứng mọi loại timeout, thiết bị hay công nghệ hỗ trợ tiếp cận. Giao diện dài khi dữ liệu biên; hoàn thiện thị giác toàn bộ ở FE-07.

Sinh viên cần tự review/chạy thử để xác nhận cá nhân; Codex không ghi thay xác nhận trong AI disclosure. **Điểm tiếp theo khi được giao: FE-04 — phân loại, bảo hành và tạo phiếu.**
