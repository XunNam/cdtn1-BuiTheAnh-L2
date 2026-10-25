# FE-02 — Hoàn thiện màn hình đăng nhập

Ngày thực hiện: **25/10/2026**. Trạng thái: **HOÀN THÀNH phạm vi FE-02**. **FE-03–07 chưa bắt đầu**.

## 1. Phạm vi và căn cứ

Sinh viên giao tiếp tục FE-02 theo [kế hoạch frontend](../../plans/frontend-l2-implementation-plan.md), sau [FE-01](phase-01.md). Đã đối chiếu AGENTS root/frontend, báo cáo FE-01, phần login/kiểm chứng trong bộ kế hoạch, code/tests/harness hiện có và tài liệu Next cài trong project về Client Components.

- **DESIGN:** [Phụ lục API](../../api-contract-l2-extension.md) — Mục2/3, A01/AUTH: username trim1–64 code point, password1–256 code point không trim/normalize;401 chung,400 field,503 giới hạn phiên, Bearer/principal do server cấp.
- **SOURCE:** BT2 — Mục2.3 — trang PDF4, đã được đối chiếu trong lần lập kế hoạch: xác thực đăng nhập cơ bản và client riêng. Không tạo FR/US/QT mới cho login.
- **IMPLEMENTATION đối chiếu:** backend `app.ts`/`validation.ts`/`auth.ts`, client/DTO/provider/guard FE-01. Backend vẫn kiểm validation/credential độc lập; helper frontend chỉ hỗ trợ UX.
- **DESIGN thị giác:** kế thừa khung đơn sắc/typography của FE-01 và đề xuất login trong [đặc tả](../../plans/frontend-l2-screen-spec.md), Mục4. File Figma đã khảo sát không có frame login; không tuyên bố đây là bản sao frame có sẵn.

**Chưa cần thay API.** Giữ A01, provider/client/guard, quyền, schema, dependency và các màn hình nghiệp vụ hiện tại.

## 2. Đã thực hiện

| File/thành phần | Thay đổi |
| --- | --- |
| `src/frontend/src/lib/login-validation.ts` | Helper thuần kiểm username/password: đúng min/max code point, trim username, không normalize Unicode, chặn NUL/surrogate không ghép; không trả password trong kết quả validation |
| `src/frontend/src/components/screens/login-screen.tsx` | Validation trước request, nhãn/lỗi/aria/focus, hiện/ẩn mật khẩu, busy/ref chặn gửi lặp, Enter/Space, thông báo400/401/503/mạng/DTO và nút Thử lại có chủ đích |
| `src/frontend/app/globals.css` | CSS riêng cho field/hint/error/toggle/submit login; giữ nguyên phong cách shell và breakpoint hiện có |
| `src/frontend/tests/api-client.test.ts` | Giữ18 test cũ, thêm4 nhóm biên/Unicode/login-validation |
| `src/frontend/tests/browser/login.spec.ts` | Thêm6 kịch bản login với API thật, fixture/harness hiện có; không fake response |
| `src/frontend/tests/browser/l2.spec.ts` | Chỉ đổi output mặc định sang phase-02 để bảo toàn toàn bộ evidence FE-01 |
| README root/frontend, kiến trúc, kế hoạch, TD-16 và báo cáo/evidence | Cập nhật tiến độ, cách dùng và kết quả thực tế |

### Hành vi đã hoàn thiện

1. Username giữ case, bỏ khoảng trắng đầu/cuối; lỗi hiển thị tại ô. Password giữ nguyên khoảng trắng và cách biểu diễn Unicode. Không dùng HTML maxLength theo UTF-16 để chặn nhầm emoji hợp lệ.
2. Có nút Hiện/Ẩn với accessible name, aria-pressed/controls; dùng Space được. Không tự sửa hoa/thường hoặc chính tả ở hai ô nhập.
3. Khi submit sai, focus đến field đầu có lỗi; lỗi credential/kết nối focus vùng thông báo. `aria-invalid` và `aria-describedby` liên kết field/error/hint.
4. Busy khóa input/toggle/submit; ref chặn thêm lượt submit trước khi state kịp render. Có trạng thái “Đang kiểm tra thông tin đăng nhập…”.
5.400 gắn `fields.username/password`;401 dùng cùng thông báo cho tên không có hoặc password sai, giữ username, không tự báo hết phiên.
6. Mạng/backend offline và503 đầy session có thông báo riêng, cho bấm Thử lại; không tự retry/login vòng lặp. Giữ dữ liệu trong form để phục hồi.
7. Sau thành công xóa password, đóng trạng thái hiện mật khẩu; phiên/return path theo FE-01. Khi rời form/logout, form mới không phục hồi password. Không ghi credential/token vào URL/storage/log. Form khai báo POST, request thực qua API client JSON.
8. Giữ cảnh báo phiên hết hạn từ provider và điều hướng hai role/URL detail đã có. Không thêm đăng ký, quên mật khẩu, ghi nhớ đăng nhập, chọn role, refresh/revoke hoặc account admin.

## 3. Quyết định kỹ thuật và đánh đổi

- Helper validation tách khỏi component để kiểm biên đúng nghĩa; không import code/backend private sang client và không thay thế server validation.
- Validation/field errors dùng React state; ref chỉ chặn gửi lặp tức thời và điều khiển focus. Không thêm thư viện form/state/UI.
- Retry dùng lại nút submit với nhãn Thử lại sau lỗi phục hồi được; chỉ gửi khi người dùng thao tác. Không tự coi503 là sai mật khẩu hoặc đổi role để né lỗi.
- Password chỉ còn trong state/closure của form trong lúc sử dụng. Test kiểm payload bằng boolean, không in giá trị password/token vào assertion diff; ảnh chụp credential đều ở trạng thái che.
- CSS bổ sung có phạm vi login; không viết lại màn hình tiếp nhận/danh sách/chi tiết. Ghi nhận hoàn thiện login tại [TD-16](../../thay-doi-thiet-ke.md).

## 4. Kiểm chứng thực tế

Các lệnh chạy từ root project.

| Kiểm chứng | Kết quả | Bằng chứng/giới hạn |
| --- | --- | --- |
| Baseline `npm --prefix src/frontend run typecheck` | PASS | Trước sửa |
| Baseline `npm --prefix src/frontend test` | PASS |18/18 từ FE-01 |
| `npm --prefix src/frontend run typecheck` | PASS | TS strict, helper và tests mới |
| `npm --prefix src/frontend run lint` | PASS | Bản cuối, không bỏ rule |
| `npm --prefix src/frontend test` | PASS |22/22,0 fail/skip:18 regression +4 nhóm mới |
| `npm --prefix src/frontend run build` | PASS | Bản cuối;9 route như FE-01, không thêm endpoint |
| `npm run test:ui` | PASS |12/12,30,2 giây ở lượt cuối;6 regression +6 FE-02, Next production/Express/PostgreSQL thật |
| Bảo toàn dữ liệu public | PASS | Harness trả `UI_FIXTURE_PUBLIC_PRESERVED`, so hash7 bảng public trước/sau; chỉ tạo/dọn schema test riêng |
| Review ảnh login1280/768/375px và lỗi375px | PASS trong phạm vi login | Đã xem desktop/mobile/validation; assertion không tràn ngang ở cả3 viewport |
| Toàn `npm test` root/backend suite riêng | NOT RUN trong FE-02 | Không sửa backend; UI suite thực đã kiểm luồng liên quan |
| Docker/clean-room/NFR03 | NOT RUN trong FE-02 | Không suy từ build/UI local thành đạt container |

Build/UI dùng quyền ghi/kết nối phù hợp với môi trường đã xác định ở FE-01; không đổi .env/credential hoặc hạ cấu hình để chạy test. Hai lượt UI có API thật đều12/12 đạt; lượt cuối chạy lại sau khi khai báo form POST và bổ sung assertion tương ứng.

### Client/unit —4 nhóm mới

- F-U19: username trim, giữ case/Unicode tổ hợp, rỗng và biên64/65 code point với emoji/combining.
- F-U20: password rỗng bị chặn, khoảng trắng/NBSP/tab hợp lệ theo A01, không tự trim.
- F-U21: biên256/257 code point với emoji/combining, không dùng UTF-16/grapheme làm độ dài contract.
- F-U22: NUL/unpaired surrogate bị chặn ở cả hai field; surrogate pair hợp lệ được nhận.

### Browser —6 kịch bản FE-02

| Mã | Đã kiểm với API thật |
| --- | --- |
| FE02-UI01 | Field/focus, input sai không POST, biên64 username/256 password emoji được server nhận validation rồi trả401 credential, responsive1280/768/375 |
| FE02-UI02 | Hiện/Ẩn/Space, Enter, busy khóa thao tác và chặn submit lặp, payload chỉ username/password, username trim/password nguyên bản có space từ fixture, không Bearer ở A01, logout xóa form |
| FE02-UI03 | User không có và password sai cùng thông báo401, giữ username/focus lỗi, không cảnh báo hết phiên giả, sửa rồi login QL thành công |
| FE02-UI04 | Request được cố ý bỏ password để Express thật trả400; field/error/focus đúng; gửi lại đầy đủ thành công |
| FE02-UI05 | Browser offline rồi backend thật offline503; giữ form và thử lại thành công sau phục hồi |
| FE02-UI06 | Cấp đủ100 session thật, API/UI trả503 AUTH_CAPACITY_REACHED, không auto retry; restart rồi bấm Thử lại thành công |

Sáu regression cũ tiếp tục đạt: luồng thiếu mua → tạo → trao đổi → duyệt; loading/empty/error/retry; role/scope; restart401/token RAM; Link giữ phiên/reload; direct detail/login/logout/Back. Regression NFR01 trên200 phiếu:100/100 dưới1500ms, p95≈47,7ms, max48,5ms. Đây là phép đo local kế thừa, không phải nghiệm thu toàn FE-07.

## 5. Minh chứng và bảo toàn phạm vi

Xem [tổng hợp minh chứng](../../tests/frontend/phase-02/verification.md), [raw NFR01](../../tests/frontend/phase-02/nfr01-local.json), [login desktop](../../tests/frontend/phase-02/login-1280.png), [mobile](../../tests/frontend/phase-02/login-375.png) và [lỗi field mobile](../../tests/frontend/phase-02/login-validation-mobile.png).

Kết quả so hash filesystem với snapshot trước FE-02 được lưu tại [file-audit.json](../../tests/frontend/phase-02/file-audit.json). Backend, API Contract/SRS/schema, package/lockfile, provider/client/guard FE-01, các form nghiệp vụ và toàn bộ evidence cũ được bảo toàn. Không sửa nguồn, .env, credential hoặc AI disclosure; không Git/commit/push.

## 6. Giới hạn và điểm dừng

Đã hoàn thành login theo phạm vi FE-02, chưa triển khai FE-03–07. Không mở rộng auth production, persist token, account admin hoặc sửa API. Lỗi timeout/DTO dùng xử lý an toàn của client và thông báo form; chưa dựng server cố tình trả JSON hỏng hoặc kéo dài quá timeout để làm minh chứng browser riêng. Không tuyên bố đạt kiểm định accessibility hay bảo mật toàn diện từ bộ thử này.

Sinh viên vẫn cần tự xem/review và bổ sung xác nhận cá nhân trong khai báo AI khi được yêu cầu; Codex không xác nhận thay. **Dừng sau FE-02**; phase tiếp theo khi được giao là FE-03 — khách hàng và thiết bị trong WF02.
