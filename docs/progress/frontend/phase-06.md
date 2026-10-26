# FE-06 — Phê duyệt ngoại lệ và ghi trao đổi

Ngày: **25/10/2026**. Trạng thái: **HOÀN THÀNH phạm vi FE-06**. **FE-07 chưa bắt đầu**.

## 1. Điều kiện bắt đầu và căn cứ

Sinh viên giao FE-06 nếu FE-05 không còn cần chỉnh sửa trước. Đã rà [báo cáo FE-05](phase-05.md), code/DTO/hook/form kế thừa, trạng thái browser và [lộ trình](../../plans/frontend-l2-implementation-plan.md). Không có blocker còn mở trong FE-05; phần validation/recovery E11/E13 được để lại đúng cho FE-06. Baseline typecheck và39 test tiếp tục PASS trước sửa.

- **DESIGN:** [Đặc tả](../../plans/frontend-l2-screen-spec.md) — Mục7.2/7.3/8/9; [API Contract](../../api-contract-l2.md) — Mục7.11/7.13, E11/E13 và E10/E12 để đối chiếu; [phụ lục](../../api-contract-l2-extension.md) — quy ước Unicode/validation. Content1–2000 code point sau trim; note tùy chọn tối đa1000, rỗng UI gửi null.
- **Truy vết:** FR06/US06/UC07 → E11/ApprovalForm → FE06-UI05–10; FR08/US08/UC06 → E13/CommunicationForm → FE06-UI01–04/11/12. NFR02 — SRS Mục5.2/Bảng13 — trang19: gọi API trực tiếp với sai quyền/chưa login và kiểm dữ liệu trước/sau. QT-05/14 theo baseline Case Study Bảng9.1 trang19; không tạo quy tắc mới.
- **IMPLEMENTATION:** backend kiểm role/center, lock/transaction, metadata duyệt đầu; E11 không đổi MOI/warranty/due/snapshot. E13 ghi đúng ticket/actor/time, không đổi cổng xử lý hoặc trạng thái phiếu. Đã đối chiếu ticket.validation.ts, tickets.service.ts và chạy API thật để xác minh.

Không cần đổi API/backend nghiệp vụ. Frontend chỉ thực thi UX theo contract. Helper UI có một fixture bổ sung để tạo409 thật; không sửa SRS/contract/schema/migration/config/seed/credential hoặc dependency.

## 2. Đã thực hiện

| File/thành phần | Nội dung |
| --- | --- |
| `components/tickets/communication-form.tsx` | Content validation/focus/count, busy/ref chặn lặp,201 receipt, bản nhập mới, saved≠reload failed, timeout giữ draft và GET đối chiếu |
| `components/tickets/approval-form.tsx` | Điều kiện3 trạng thái, note nullable/Unicode,200 metadata,409/read recovery, timeout/403/404/400 và lỗi đọc lại sau thành công |
| `src/lib/ticket-action-validation.ts` | Helper content/note, applicability, kiểm response E11, field400 và phân biệt kết quả ghi chưa xác định |
| `hooks/use-ticket-record.ts` | E10 giữ dữ liệu đã xác nhận khi đọc lại, apply subset approval từ response và generation bỏ request cũ |
| `hooks/use-communication-history.ts` | E12 đọc trang hiện tại/cuối theo meta, sửa trang vượt tổng và generation, công bố lỗi GET riêng |
| `components/tickets/ticket-detail.tsx`, `communication-history.tsx`, `action-error.tsx` | Ghép controller/form theo role; E12 chỉ bắt đầu sau E10 hợp lệ; lỗi field/404 chung, không bỏ nội dung đã đọc khi sync lỗi |
| `components/legacy/ticket-actions.tsx` | Bỏ form cũ sau thay thế; không còn đường ghi kế thừa |
| `src/frontend/app/globals.css` | Khoảng cách nút, focus vùng xác nhận/lỗi; giữ bố cục responsive FE-05 |
| `tests/api-client.test.ts`, `tests/browser/tickets-write.spec.ts` |6 nhóm unit/client và12 case UI API thật; giữ37 regression |
| Browser specs trước | Output mới phase-06; selector nội dung đã lưu giới hạn trong vùng lịch sử vì có receipt cùng nội dung; không bỏ assertion nghiệp vụ |
| `src/backend/scripts/ui-test.ts` | Fixture trạng thái không còn được duyệt, ticket+log cùng transaction, chỉ schema test |
| README/kiến trúc/lộ trình/TD-20/evidence | Cập nhật hành vi và kết quả thực tế |

Đường dẫn components/hooks rút gọn từ `src/frontend/src/`; `src/lib/` và tests từ `src/frontend/`.

## 3. Quyết định kỹ thuật

### Ghi trao đổi

1. Chỉ NV có form; content trim1–2000 code point, không normalize, chặn NUL/surrogate lẻ/toàn trắng. Lỗi field gắn aria/focus, không dùng maxLength UTF-16. Ref khóa ngay trong cùng lượt sự kiện; request chỉ `{content}`, ticket từ path.
2. Sau201 đã decode đúng ticket mới xác nhận, lưu Communication response, xóa draft đã lưu và ẩn nút POST của bản nhập đó. Receipt có ID/content/time/actor thật, không tự gán thông tin từ người đang login.
3. Controller E12 đọc tổng/meta rồi trang cuối phù hợp. POST thành công và GET lỗi là hai kết quả riêng: receipt vẫn còn, chỉ retry GET, không còn nút lưu lại bản nhập đã xác nhận. Người dùng bấm “Ghi trao đổi tiếp” để có bản nhập rỗng mới.
4. Mạng/timeout/5xx/DTO lỗi có thể xảy ra sau commit: giữ draft khóa, không auto POST. “Kiểm tra lịch sử” chỉ GET E12; nội dung giống nhau không được xem như định danh chắc chắn. Sau đối chiếu, người dùng có thể xác nhận bắt đầu bản nhập mới rỗng; không tự gửi lại draft cũ.

### Phê duyệt

1. Chỉ QL có action khi E10 là MOI + CHUA_XAC_MINH + CHO_PHE_DUYET. Không có từ chối, sửa snapshot hoặc bước sửa chữa. Server vẫn kiểm quyền/điều kiện bắt buộc.
2. Note tối đa1000 code point sau trim, không bắt buộc; bỏ trống/toàn ký tự trim UI gửi null. Không nhận actor/time/status từ input. Ref/state khóa submit, giữ input khi400.
3.200 phải đúng ticket, MOI/CHUA_XAC_MINH/DA_PHE_DUYET, can_proceed=true và có approved_by/at. Chỉ merge phần approval của response vào detail đã đọc, giữ snapshot/hạn rồi GET E10. Nếu GET lỗi, vẫn xác nhận đã duyệt và giữ metadata từ200; retry chỉ đọc.
4.409 ALREADY_APPROVED/APPROVAL_NOT_APPLICABLE khóa action cũ và GET E10. UI dùng người/giờ/note đầu từ server, không dùng ghi chú người đến sau để ghi đè. Khi trạng thái không còn hợp lệ thì không hiện action.
5. Timeout/mạng/5xx/DTO chưa xác định: không auto gửi lại; bấm kiểm tra E10. Đã duyệt thì hiện metadata server; vẫn chờ và đủ điều kiện thì cho người dùng kiểm tra rồi chủ động xác nhận; không còn áp dụng thì khóa.400 giữ note,403/404 báo quyền/tài nguyên và chặn ghi;401 theo client đưa về login/dọn dữ liệu.

### Đọc dữ liệu và giới hạn kiến trúc

Hai controller E10/E12 giữ trạng thái riêng để lưu thành công không bị biến thành thất bại do GET sau đó. Generation và cleanup bỏ request cũ; đổi ID remount cả form/controller, version phiên API client tiếp tục bảo vệ qua logout. Không sửa hook useRemote dùng chung, API client hoặc DTO. Không thêm thư viện/state store/endpoint.

Fixture `advance-test-ticket` nhận ticket ID dương an toàn qua file control riêng của harness, chuyển MOI→DA_PHAN_CONG và ghi status log cùng transaction trong schema test. Mục đích là tạo trạng thái không còn được duyệt để kiểm409; không triển khai module phân công, không public endpoint hoặc thay luật trạng thái. Test này chạy sau các fixture đọc cũ để tránh dữ liệu âm của ca kiểm ảnh hưởng ca trước. Dọn schema và fingerprint public vẫn qua helper cũ.

## 4. Kiểm chứng thực tế

Lệnh từ root project:

| Lệnh/kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| Baseline frontend typecheck/test | PASS |39/39 trước sửa |
| `npm --prefix src/frontend run typecheck` | PASS | Bản code/tests cuối; build cũng typecheck |
| `npm --prefix src/frontend run lint` | PASS | Không warning/rule bị bỏ |
| `npm --prefix src/frontend test` | PASS |45/45,0 fail/skip;39 regression +6 nhóm mới |
| `npm --prefix src/backend run typecheck` | PASS | Helper fixture có transaction đúng kiểu |
| `npm --prefix src/frontend run build` | PASS | Next production,9 route như trước |
| `npm run test:ui` | PASS |49/49 trong1,8 phút;12 FE-06 +37 regression, API/PostgreSQL thật |
| Public fingerprint | PASS | `UI_FIXTURE_PUBLIC_PRESERVED`, chỉ tạo/dọn schema test |
| NFR02 trực tiếp API | PASS trong bộ trường hợp đã chạy | E11 no token401, NV403, QL ngoài center404; approval trước/sau nguyên; QL E13→403, lịch sử nguyên |
| Ảnh/responsive | PASS trong phần đã kiểm | Regression4 viewport không tràn; đã xem saved/GET lỗi,409, phục hồi duyệt và mobile |
| Root npm test/backend suite đầy đủ | NOT RUN trong FE-06 | Backend production không đổi; UI liên quan và helper typecheck đã chạy |
| Docker/clean-room/NFR03 | NOT RUN trong FE-06 | Không suy từ UI local thành nghiệm thu đóng gói |

Trong phát triển, typecheck phát hiện nhánh render unknown chưa thành ReactNode và lint cảnh báo ref cleanup; đã sửa điều kiện render rõ ràng và hàm invalidate ổn định, không ép kiểu/disable rule. Build, lint và browser cuối đạt. Lượt49 browser không có FAIL.

### Unit/client F-U40–45

Content1/2000/2001, note0/1000/1001, whitespace/emoji/combining/NUL/surrogate; đủ3 điều kiện duyệt; xác nhận E11 đúng ticket/metadata và không sửa snapshot; lỗi field/unknown vs từ chối; E11 chỉ note, E13 chỉ content, actor/time từ response.

### Browser FE06-UI01–12

| Case | Đã kiểm bằng API thật |
| --- | --- |
| UI01 | Content thiếu/whitespace/2001 bị chặn,2000 emoji được lưu; busy2 click cùng lượt chỉ1 POST; payload content; receipt/time/actor và bản ghi21 ở trang3 |
| UI02 |400 thật do request thiếu field, giữ draft/focus; chủ động gửi lại thành công |
| UI03 |201 rồi GET lịch sử lỗi, vẫn saved; retry GET không POST, bản nhập tiếp rỗng |
| UI04 | E13 commit rồi timeout10s; GET thấy bản ghi nhưng không suy kết quả từ content, không POST lại; xác nhận mở draft mới |
| UI05 | Note1001 chặn/1000 lưu, trim/body chỉ note, busy1 POST, metadata server; MOI/warranty/snapshot/SLA nguyên, hàng chờ tải lại khi về |
| UI06 | QL21 duyệt trước, QL22 stale POST→409; metadata/note đầu giữ nguyên, action bị bỏ |
| UI07 | Fixture sang DA_PHAN_CONG; POST→409 APPROVAL_NOT_APPLICABLE thật, GET cập nhật và bỏ action |
| UI08 | E11 commit rồi timeout10s, note blank→null; GET phục hồi metadata, chỉ1 POST |
| UI09 |200 rồi E10 lỗi, giữ xác nhận/metadata; retry GET không POST |
| UI10 | NFR02 gọi trực tiếp E11/E13 sai quyền/no token/ngoài scope, so dữ liệu trước/sau |
| UI11 | E13 response về muộn sau đổi ID không ghi/xác nhận vào phiếu mới |
| UI12 |403 giữ draft/phiên; restart làm401 thật khi POST, về login và dọn dữ liệu |

NFR01 regression local:200 phiếu,1 warm-up,100/100 dưới1500ms, p95≈48,4ms, max≈49,2ms. [Raw JSON](../../tests/frontend/phase-06/nfr01-local.json); không nghiệm thu toàn FE-07 từ số đo local này.

## 5. Minh chứng và bảo toàn

[Verification](../../tests/frontend/phase-06/verification.md), [log UI](../../tests/frontend/phase-06/browser-run.txt), [saved nhưng GET lỗi](../../tests/frontend/phase-06/communication-saved-reload-error.png), [trao đổi chưa xác định](../../tests/frontend/phase-06/communication-uncertain.png), [409](../../tests/frontend/phase-06/approval-conflict.png), [phục hồi duyệt](../../tests/frontend/phase-06/approval-recovered.png), [mobile](../../tests/frontend/phase-06/detail-375.png).

[File audit](../../tests/frontend/phase-06/file-audit.json) so SHA-256 với snapshot344 tệp trước FE-06, tách helper backend khỏi production. Contract/SRS/schema, dependency, API client/DTO/auth, intake và evidence/báo cáo cũ được kiểm bảo toàn. Không Git/commit/push, sửa tài liệu nguồn hoặc AI disclosure.

## 6. Giới hạn và điểm dừng

Không có blocker mới còn mở trong phạm vi đã kiểm. **Dừng sau FE-06; FE-07 chưa bắt đầu.**

API không có idempotency E13 và không có định danh chắc chắn khi mất response trước ID; UI không thể tự kết luận bằng content/time. Bản nhập mới sau đối chiếu là quyết định của người dùng, không bảo đảm exactly-once nếu gửi lại ở tab/phiên khác. Reload/đổi route mất draft RAM; logout client không thu hồi token server hoặc hủy transaction đã được server nhận. Những giới hạn E08/auth của các phase trước giữ nguyên.

Đã kiểm các nhánh quyền/two-manager/commit-timeout và37 regression, không thay thế full backend suite/Docker/NFR03/accessibility toàn diện của bước bàn giao FE-07. Sinh viên cần tự review/chạy thử để xác nhận cá nhân; Codex không xác nhận thay hoặc sửa AI disclosure khi chưa được giao.
