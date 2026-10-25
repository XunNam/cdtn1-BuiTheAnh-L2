# FE-04 — Phân loại, bảo hành và tạo phiếu

Ngày: **25/10/2026**. Trạng thái: **HOÀN THÀNH phạm vi FE-04**. **FE-05–07 chưa bắt đầu**.

## 1. Phạm vi và căn cứ

Sinh viên giao bắt đầu FE-04 nếu FE-03 đủ điều kiện. Đã đọc [FE-03](phase-03.md), [lộ trình](../../plans/frontend-l2-implementation-plan.md), [đặc tả WF02](../../plans/frontend-l2-screen-spec.md) Mục6.3–6.5/8/9 và [kế hoạch kiểm chứng](../../plans/frontend-l2-verification-plan.md). Baseline frontend typecheck và29 test đều PASS trước sửa; FE-03 không có điều kiện chặn FE-04.

- **SOURCE:** Case Study Mekong Mobile — Mục6.1 — trang10: kiểm soát thiếu ngày mua và hạn hẹn; Mục6.2/Hình6.2 — trang10–11: vòng đời; Mục8 — trang15–16: device/ticket; Mục9/Bảng9.1 — trang19: QT-03/04/05/06. Đã đọc PDF nguồn, gồm ngữ cảnh phát biểu/biểu mẫu/dữ liệu mẫu; không sửa nguồn.
- **DESIGN:** SRS — FR02–05/US02–05/UC02–05, trang10–14; [API Contract](../../api-contract-l2.md) — Mục7.6–7.8, E06/E07/E08; [phụ lục](../../api-contract-l2-extension.md) — DD08/TEXT-01/02; [decision log](../backend/decision-log.md) — DD02/DD05/DD06/DD08. Hết hạn vẫn tiếp nhận là quyết định DD02 đã được sinh viên chấp thuận, không suy ra miễn phí.
- **IMPLEMENTATION:** E06 đọc nhóm active; E07 dùng ngày server; E08 recheck owner/active/category, tính snapshot và SLA, tạo ticket+log trong transaction. Không chuyển các luật này xuống frontend.

**Không cần thay API hoặc thiết kế nghiệp vụ.** Chỉ mở rộng helper kiểm thử backend trong schema riêng; mã backend production, contract/SRS/schema/migration/config/seed/credential và dependency giữ nguyên. Không sửa Figma; dùng đặc tả wireframe đã lưu.

## 2. Đã thực hiện

| File/thành phần | Thay đổi |
| --- | --- |
| `src/frontend/src/components/intake/classification-form.tsx` | Nhập mô tả/nhóm/ưu tiên, lỗi field/focus, count code point, E06/E07 độc lập, summary, gửi E08 và xử lý kết quả chưa xác định |
| `components/intake/warranty-preview.tsx` | Hiển thị ngày đánh giá/ngày mua/tháng/ngày hết hạn/trạng thái/requires_approval từ E07; không tính bảo hành client |
| `components/intake/ticket-receipt.tsx` | Kết quả201: mã/ID, Mới/bảo hành/phê duyệt/can_proceed, thời điểm/hạn/snapshot từ E08; focus xác nhận; mở chi tiết hoặc tiếp nhận mới |
| `src/lib/ticket-validation.ts`, `src/lib/date-time.ts` | Validation mô tả1–2000 code point, danh mục/enum, fields400, phân biệt kết quả ghi chưa xác định; định dạng timestamp theo Việt Nam |
| `components/screens/intake-screen.tsx` | Quản lý draft/submitting/uncertain/created; khóa lựa chọn khi POST/đã tạo/chưa rõ kết quả; reset bản nhập mới rõ ràng |
| `components/legacy/intake-forms.tsx` | Bỏ form cũ sau khi được thay thế, không còn import; giữ các form danh sách/chi tiết/phê duyệt/trao đổi khác |
| `src/frontend/app/globals.css` | Bố cục summary/actions/focus/fieldset, giữ responsive và phong cách hiện có |
| `tests/api-client.test.ts`, `tests/browser/ticket-intake.spec.ts` |6 nhóm unit/client mới và9 kịch bản browser API thật |
| `tests/browser/l2.spec.ts`, intake/login specs | Regression qua receipt rồi mở detail, selector theo vùng tải độc lập; output mới phase-04, không bỏ assertion nghiệp vụ |
| `src/backend/scripts/ui-test.ts` | Clock nghiệp vụ qua dependency sẵn có; điều khiển nhóm active trong schema test; giữ clock auth thật và fingerprint public |
| README, kiến trúc, lộ trình, TD-18 và evidence | Cập nhật hiện trạng, cách dùng và kết quả kiểm chứng |

Các đường dẫn rút gọn trong bảng tính từ `src/frontend/src/`, trừ hàng có prefix `tests/` tính từ `src/frontend/`.

## 3. Hành vi và quyết định kỹ thuật

1. E06 và E07 có loading/error/retry riêng. Nhóm rỗng/lỗi hoặc preview chưa đọc được thì chưa tạo; retry GET không xóa mô tả/ưu tiên còn trong bản nhập. Không tự chọn nhóm hoặc ưu tiên, không hardcode category ID.
2. Mô tả trim1–2000 code point, hỗ trợ xuống dòng/emoji/combining; chặn toàn trắng/NUL/surrogate lẻ. Không dùng maxLength theo UTF-16. Sai field hiển thị ngay gần ô, có aria-invalid/describedby và focus lỗi đầu; server vẫn kiểm lại độc lập.
3. Preview nhận ngày server, ngày mua nullable, số tháng, expiry, trạng thái và requires_approval. Không gửi assessment_date từ ngày máy; thiếu ngày mua cần duyệt, hết hạn vẫn tiếp nhận theo DD02. Đổi thiết bị bỏ preview/draft cũ như FE-03.
4. Tóm tắt hiển thị khách/thiết bị/nhóm/ưu tiên/trung tâm/người tiếp nhận. Thời điểm và hạn trước POST ghi “Được xác định khi tạo phiếu”. Không cho nhập actor/time/status hoặc tự tính hạn bằng giờ máy.
5. E08 chỉ gửi customer_id/device_id/center_id/issue_desc/category_id/priority; center từ principal. Ref chặn gửi lặp tức thời; fieldset và ref ở parent khóa đổi khách/thiết bị khi đang ghi. Response phải đúng customer/device/center đang gửi.
6.201 thay form bằng receipt; dùng toàn bộ snapshot chính thức E08 dù khác preview, không mở lại nút tạo của bản nhập đó. Có link mở WF03 và nút “Tiếp nhận mới”. Back không tự gửi POST. Date giữ YYYY-MM-DD; timestamp hiển thị dd/MM/yyyy HH:mm tại Asia/Ho_Chi_Minh, ISO gốc giữ trong dữ liệu/time datetime.
7.400 giữ nội dung, gắn lỗi field; nhóm đã ngừng thì đọc lại E06.404/owner mismatch giữ draft và yêu cầu chọn lại, khóa tạo bằng lựa chọn cũ. Không đổi chủ hoặc giả lập ghi thành công.401/403 tiếp tục theo client/guard hiện có.
8. Mạng/timeout/5xx/lỗi DTO sau POST đều có thể xảy ra sau commit: khóa bản nhập ở trạng thái chưa xác định, không có nút tự retry POST. Nếu có ID từ nguồn đối chiếu, người dùng mở WF03 bằng ID. E08 không có API tìm theo bản nhập/idempotency, nên không tự nhận diện phiếu bằng nội dung/thời gian.
9. Hủy nhập khi có dữ liệu phân loại cần xác nhận. Chấp nhận hủy chỉ reset UI, không xóa customer/device đã tạo. Sau201 không hiện “Hủy nhập” như thể hủy được phiếu đã lưu.

Tái dùng API client/hook/DTO/nhãn hiện có; không thêm thư viện hoặc endpoint. State cục bộ phù hợp prototype; không persist bản nhập/token sang browser storage. Helper test truyền clock qua tham số now đã có của device/warranty/ticket service, không tạo endpoint chỉnh giờ hoặc sửa production service. Điều khiển nhóm ngừng chỉ cập nhật issue_category trong schema do harness tạo; restart khôi phục clock/catalog. Auth tiếp tục dùng giờ thật để thay ngày nghiệp vụ không vô tình làm hết phiên.

## 4. Kiểm chứng thực tế

Lệnh từ root project. Các kiểm tra cuối đều chạy trên bản mã sau cùng; build gồm9 route như trước.

| Lệnh/kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| Baseline frontend `typecheck`, `test` | PASS |29 test từ FE-03 trước sửa |
| `npm --prefix src/frontend run typecheck` | PASS | Đã chạy riêng; build cuối tiếp tục typecheck toàn project/tests |
| `npm --prefix src/frontend run lint` | PASS | Bản cuối, không bỏ rule |
| `npm --prefix src/frontend test` | PASS |35/35,0 fail/skip;29 regression +6 nhóm F-U30–35 |
| `npm --prefix src/backend run typecheck` | PASS | Helper fixture vẫn đúng kiểu; không sửa backend production |
| `npm --prefix src/frontend run build` | PASS | Next production,9 route, bản cuối có định dạng thời gian |
| `npm run test:ui` | PASS |29/29, lượt cuối báo1,1 phút, Next production/Express/PostgreSQL thật |
| Public fingerprint trước/sau UI | PASS | `UI_FIXTURE_PUBLIC_PRESERVED`; tạo/dọn đúng schema/cổng/credential tạm |
| Responsive/ảnh | PASS trong phạm vi FE-04 | Browser kiểm không tràn ngang1920/1280/768/375px; đã xem desktop/mobile/receipt |
| Root `npm test`/backend suite đầy đủ | NOT RUN trong FE-04 | Đã chạy backend typecheck và UI liên quan; không tuyên bố toàn suite đã chạy |
| Docker/clean-room/NFR03 | NOT RUN trong FE-04 | Giữ cấu hình, không suy từ UI local thành kết quả container |

Lượt UI đầu25/29:3 lỗi locator nhãn mới trùng một phần và1 so timestamp không tính phần mili giây; đã sửa nhãn generic và so cùng thời điểm bằng Date.parse, không hạ assertion nghiệp vụ. Các lượt sau29/29. Rà ảnh cuối đã loại lời nhắc lỗi mạng chung “thử lại” khỏi POST chưa xác định, thay bằng cảnh báo riêng không gửi lại; lượt xác nhận cuối tiếp tục29/29. Không dùng kết quả FAIL làm bằng chứng PASS.

### Unit/client mới

F-U30/31 kiểm mô tả1/2000/2001, whitespace/emoji/combining/NUL/surrogate; F-U32 kiểm membership danh mục, không default priority và whitelist field400; F-U33 kiểm E07 không ngày máy/E08 đúng6 field và giữ snapshot mới; F-U34 phân biệt từ chối ghi với kết quả chưa xác định; F-U35 kiểm định dạng Việt Nam và biên00:00.

### Browser API thật

| Mã | Nội dung đã kiểm |
| --- | --- |
| FE04-UI01 | Không default nhóm/ưu tiên, field/focus, whitespace/2001 không POST,2000 emoji được server lưu;400 thật giữ input rồi201 |
| FE04-UI02 | Còn/hết/thiếu mua, đúng ngày hết hạn và ngày sau; cả3 mức ưu tiên; thứ Bảy/Chủ nhật từ clock server, Mới/approval/can_proceed/hạn đúng |
| FE04-UI03 | Preview ngày30/09 còn hạn, tạo01/10 hết hạn; receipt lấy snapshot E08 mới; payload đúng6 field, E07 không assessment_date |
| FE04-UI04 | Nhóm rỗng/lỗi và preview lỗi độc lập, retry GET giữ mô tả |
| FE04-UI05 | Nhóm hoặc device ngừng sau preview, server từ chối thật, giữ draft, không receipt giả và chặn lựa chọn đã mất hiệu lực |
| FE04-UI06 | Khóa khách/thiết bị/hủy khi ghi,2 click cùng lượt chỉ1 POST; receipt mở detail/Back không tự POST, tạo tiếp/reset rõ ràng |
| FE04-UI07 | API thật đã commit, giữ response quá timeout10 giây; draft chưa xác định, chỉ1 POST; E10 xác nhận phiếu thực sự đã lưu |
| FE04-UI08 | Hủy có dismiss/accept qua bàn phím, customer/device vẫn đọc được; responsive4 viewport |
| FE04-UI09 | POST commit và response về muộn sau logout; không phục hồi receipt/dữ liệu hoặc gửi lại trong phiên mới |

20 regression trước giữ login/session/scope, khách/thiết bị, các trạng thái tải/rỗng/lỗi, luồng thiếu mua → tạo → trao đổi → QL duyệt và NFR01. NFR01 local:200 phiếu,1 warm-up,100/100 dưới1500ms, p95≈48,2ms, max≈49,1ms; xem [raw JSON](../../tests/frontend/phase-04/nfr01-local.json). Không xem đây là nghiệm thu toàn FE-07.

## 5. Minh chứng và bảo toàn phạm vi

Xem [verification](../../tests/frontend/phase-04/verification.md), [log UI cuối](../../tests/frontend/phase-04/browser-run.txt), [desktop](../../tests/frontend/phase-04/classification-1280.png), [mobile](../../tests/frontend/phase-04/classification-375.png), [kết quả chờ duyệt](../../tests/frontend/phase-04/ticket-pending.png) và [timeout](../../tests/frontend/phase-04/ticket-uncertain.png).

[File audit](../../tests/frontend/phase-04/file-audit.json) so SHA-256 với snapshot236 tệp trước FE-04, không Git. Phân biệt helper UI test thay đổi với backend production giữ nguyên; kiểm contract/SRS/schema, dependency, API client/DTO/auth và evidence các phase trước. Không sửa AI disclosure, nguồn, credential/config thật; không commit/push.

## 6. Giới hạn và điểm dừng

**Dừng sau FE-04.** FE-05 danh sách/chi tiết, FE-06 phê duyệt/trao đổi và FE-07 thị giác/regression/bàn giao chưa bắt đầu. Luồng đọc/ghi các màn hình đó vẫn hoạt động qua form kế thừa và đã regression, không đồng nghĩa đã hoàn thiện phase sau.

API chưa hỗ trợ idempotency hoặc tìm phiếu theo bản nhập cho NV; vì vậy không thể tự phục hồi ID khi mất response E08. Khóa giao diện giảm gửi lặp, không bảo đảm exactly-once sau đóng trang/mất phiên. Đổi route/reload làm mất draft cục bộ; trường hợp hủy bằng nút có xác nhận, không bổ sung hệ thống autosave/navigation blocker. Không nghiệm thu accessibility toàn diện hoặc mọi thiết bị từ các ảnh/keyboard checks này. Sinh viên cần tự review/chạy thử và tự xác nhận khai báo AI khi được yêu cầu.
