# Frontend L2 — FE-01 đến FE-07

Giữ Next.js/React/TypeScript. FE-01 tách session/route/khung; FE-02 login; FE-03 khách/thiết bị; FE-04 phân loại/bảo hành/tạo phiếu; FE-05 danh sách/chi tiết/lịch sử; FE-06 hoàn thiện ghi trao đổi và phê duyệt ngoại lệ. FE-07 hoàn thiện thị giác/responsive/keyboard, hồi quy và bàn giao. Dữ liệu nghiệp vụ lấy từ API thật.

| Route giao diện | Hành vi hiện tại |
| --- | --- |
| `/` | Chuyển đến login hoặc trang theo vai trò |
| `/login` | Form A01: validation Unicode, hiện/ẩn mật khẩu, lỗi field, busy/retry và điều hướng theo phiên |
| `/intake` | NV: khách/thiết bị, phân loại và bảo hành cùng màn hình; tạo thành công hiển thị kết quả, mở chi tiết hoặc tiếp nhận mới |
| `/tickets` | QL: E09 chờ/đã duyệt, đúng meta/sort, giữ filter/page; NV: mở ID an toàn, không gọi E09 |
| `/tickets/[ticketId]` | Chi tiết/snapshot/lịch sử độc lập; NV ghi trao đổi, QL duyệt theo điều kiện; validation, xác nhận lưu, xử lý409 và phục hồi GET sau mất phản hồi |

Layout của route group giữ một `SessionProvider` và một API client. Link nội bộ giữ phiên; reload/tab mới phải đăng nhập lại. UI guard không render dữ liệu riêng trước login, kiểm role ở route; backend vẫn kiểm quyền trên mỗi request. Header dùng ID nhân viên/trung tâm vì API chưa có tên tham chiếu. Sidebar chuyển thành điều hướng ngang ở màn hình nhỏ.

Mọi request dùng src/lib/api-client.ts và contracts.ts: Bearer RAM, JSON/error envelope, 401/403/404/409, timeout/network, runtime DTO. FE-01 thêm version phiên để phản hồi cũ không đưa hồ sơ vào phiên mới hoặc xóa token mới; login401 là lỗi credential tại form. Components không fetch trực tiếp. Proxy app/api/[...path]/route.ts forward tới Express; không truy cập PostgreSQL. Đăng xuất chỉ xóa phiên client, chưa có endpoint revoke.

FE-02 dùng `src/lib/login-validation.ts`: username trim1–64 code point, password1–256 code point giữ nguyên khoảng trắng/cách viết Unicode, chặn NUL/surrogate không ghép. Form có label/lỗi gần ô, focus đến lỗi, nút hiện/ẩn dùng bàn phím và khóa gửi lặp. Lỗi401 chung không tiết lộ tài khoản; lỗi mạng/503 có nút Thử lại do người dùng bấm. Không tự retry, không điền credential mẫu hoặc thêm chức năng quản trị tài khoản. Form khai báo POST; request thực vẫn qua API client JSON.

Từ root làm đúng [README](../../README.md). Cấu hình mẫu tại .env.example: NEXT_PUBLIC_L2_API_BASE=/api; L2_API_PROXY_TARGET=http://127.0.0.1:3001 chỉ server. Không đặt mật khẩu DB hoặc server secret vào NEXT_PUBLIC_*.

| Lệnh tại src/frontend | Mục đích |
| --- | --- |
| npm ci | Cài theo lockfile |
| npm run dev | Next dev |
| npm run build | Production standalone |
| npm run typecheck | Kiểm TypeScript |
| npm run lint | ESLint |
| npm test | 45 case client/DTO/session/navigation/validation/thời gian/query/phân trang/ghi-phê duyệt |
| npm run test:ui | Playwright, cần fixture do harness cung cấp |

Để chạy đủ UI, dùng **npm test từ root** hoặc npm run test:ui từ root sau build. Harness Backend tạo schema/credential/cổng riêng và chạy Next production; không gọi Playwright trần khi thiếu fixture. Playwright là dev dependency phục vụ minh chứng, không vào runtime image Frontend.

Các route thử cũ /customers và /customers/new vẫn redirect về màn hình chính.53 kịch bản browser gồm4 regression Phase 6,2 FE-01,6 FE-02,8 FE-03,9 FE-04,8 FE-05 và12 FE-06,4 FE-07. Output mặc định hiện ở `docs/tests/frontend/phase-07/`, có thể đổi bằng `L2_UI_OUTPUT_DIR`; giữ nguyên evidence các phase trước. Loading dùng trì hoãn request thật; lỗi400/409 do Express thật,503 bằng backend offline hoặc đầy session thật. Test timeout E08/E11/E13 cho API thật commit rồi giữ phản hồi quá10 giây; không giả response nghiệp vụ.

FE-03 dùng `components/intake/` và `src/lib/intake-validation.ts`: giữ phone raw riêng với kết quả masked, serial exact giữ case/số0, ngày mua nullable và tháng bảo hành từ server. E03/E05 phân trang theo metadata; đổi khách/thiết bị xóa lựa chọn và preview cũ. Khi POST mất phản hồi, người dùng tra cứu GET trước khi gửi thêm; không tự POST lại. Mỗi vùng có trạng thái tải/rỗng/lỗi riêng.

FE-04 dùng ClassificationForm/WarrantyPreview/TicketReceipt và `src/lib/ticket-validation.ts`: mô tả1–2000 code point sau trim, chọn nhóm/ưu tiên rõ ràng, danh mục và preview tải độc lập. E08 chỉ gửi6 field contract; server tính snapshot và hạn. Sau201 khóa bản nhập, hiện mã/ID/trạng thái/hạn từ response; thời gian hiển thị dd/MM/yyyy HH:mm tại Asia/Ho_Chi_Minh. Hủy nhập có xác nhận khi có dữ liệu; không xóa customer/device đã lưu. Khi POST chưa rõ kết quả, giữ bản nhập và không gửi lại; nếu có ID có thể mở chi tiết để kiểm tra.

FE-05 dùng `components/tickets/` và `src/lib/ticket-list-query.ts`: E09 chỉ QL, bảng dùng summary không kéo E10 từng hàng; empty đối chiếu filter còn lại với size1, probe lỗi không suy toàn bộ rỗng. URL nội bộ chỉ mang enum/page đã kiểm; về từ chi tiết tải lại và tự về trang hợp lệ nếu cần. E10 dùng snapshot, phone từ server và fallback ID sản phẩm/nhóm/người duyệt; không gọi catalog dành NV cho QL. E12 tải/retry/phân trang riêng, lỗi lịch sử không xóa E10; đổi ID dọn dữ liệu/draft cũ.

FE-06 thay form kế thừa bằng CommunicationForm/ApprovalForm. Content trim1–2000 code point; note tùy chọn trim tối đa1000, bỏ trống gửi null. Ref khóa gửi lặp; server gán actor/time. E13 xác nhận201 rồi mới xóa draft, hiện ID/time/actor và đọc trang cuối; GET lỗi vẫn giữ xác nhận, chỉ retry GET. E11 chỉ hiện khi Mới/Chưa xác minh/Chờ duyệt;200 dùng metadata response,409 đọc lại, không đổi SLA/snapshot. POST mất phản hồi không tự gửi lại: E11 đối chiếu E10; E13 đọc E12 nhưng không suy từ content trùng. Sau đối chiếu, người dùng có thể chủ động bắt đầu bản nhập trao đổi mới. Hai controller đọc giữ dữ liệu đã xác nhận khi GET tiếp theo lỗi.

Harness `src/backend/scripts/ui-test.ts` có catalog/clock fixture và điều khiển trạng thái một ticket test để kiểm409 không còn được duyệt; ghi ticket+status log cùng transaction chỉ trong schema riêng. Không thêm API chuyển trạng thái hoặc module phân công. Auth dùng giờ thật; không đổi backend production/config/seed/contract/dependency. Xem [kế hoạch](../../docs/plans/frontend-l2-implementation-plan.md), [FE-01](../../docs/progress/frontend/phase-01.md), [FE-02](../../docs/progress/frontend/phase-02.md), [FE-03](../../docs/progress/frontend/phase-03.md), [FE-04](../../docs/progress/frontend/phase-04.md), [FE-05](../../docs/progress/frontend/phase-05.md), [FE-06](../../docs/progress/frontend/phase-06.md). FE-07 hoàn thành; xem [báo cáo bàn giao](../../docs/progress/frontend/phase-07.md), [minh chứng](../../docs/tests/frontend/phase-07/verification.md) và [dự thảo khai báo AI](../../docs/progress/frontend/ai-disclosure-draft.md).

FE-07 giữ CSS/component hiện có: WF02 ba cột từ1280px, hai cột768–1279px, một cột dưới768px; nhóm tra cứu xếp dọc dưới1280px để ô nhập không bị bó hẹp. Vùng03 phân loại/vùng04 kiểm tra-tạo vẫn chung một form/fieldset; kết quả bảo hành và hạn từ server. Form trao đổi NV nằm dưới lịch sử; QL duyệt ở cột bên. Bảng có gợi ý cuộn và focus rõ, lỗi textarea/select có border. Bốn ca polish kiểm keyboard/label/focus, dữ liệu dài/HTML là text và overflow; không thêm thư viện/font/network request.

Kiểm chứng cuối: backend94 unit/HTTP +95 PG (gồm5 nhóm cha), frontend45 client +53 UI; full suite container cũng đạt. NFR01 local100/100 dưới1,5 giây trên200 phiếu, NFR02 đạt9/9 request trái quyền bị từ chối mà dữ liệu giữ nguyên, NFR03 Compose riêng đạt startup hai lệnh sau chuẩn bị và UI/restart/persistence. Không tuyên bố pixel parity/WCAG đầy đủ/production hoặc toàn bộ BT3. GAP-01–10 và giới hạn session/POST chưa rõ kết quả tiếp tục theo đặc tả.
