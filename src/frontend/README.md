# Frontend L2 — FE-01 đến FE-04

Giữ Next.js/React/TypeScript. FE-01 tách session, khung giao diện và các route; FE-02 hoàn thiện đăng nhập A01; FE-03 gộp khách hàng/thiết bị; FE-04 hoàn thiện phân loại, xem trước bảo hành và kết quả tạo phiếu trong màn hình tiếp nhận. FE-05–07 chưa thực hiện. Dữ liệu nghiệp vụ lấy từ API thật.

| Route giao diện | Hành vi hiện tại |
| --- | --- |
| `/` | Chuyển đến login hoặc trang theo vai trò |
| `/login` | Form A01: validation Unicode, hiện/ẩn mật khẩu, lỗi field, busy/retry và điều hướng theo phiên |
| `/intake` | NV: khách/thiết bị, phân loại và bảo hành cùng màn hình; tạo thành công hiển thị kết quả, mở chi tiết hoặc tiếp nhận mới |
| `/tickets` | QL: hàng chờ/đã duyệt E09; NV: mở phiếu bằng ID, không tải E09 |
| `/tickets/[ticketId]` | NV/QL xem chi tiết; giữ ghi trao đổi NV và phê duyệt QL từ Phase 6 |

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
| npm test | 35 case client/DTO/session/navigation/login/intake/ticket-validation/thời gian |
| npm run test:ui | Playwright, cần fixture do harness cung cấp |

Để chạy đủ UI, dùng **npm test từ root** hoặc npm run test:ui từ root sau build. Harness Backend tạo schema/credential/cổng riêng và chạy Next production; không gọi Playwright trần khi thiếu fixture. Playwright là dev dependency phục vụ minh chứng, không vào runtime image Frontend.

Các route thử cũ /customers và /customers/new vẫn redirect về màn hình chính.29 kịch bản browser gồm4 regression Phase 6,2 FE-01,6 FE-02,8 FE-03 và9 FE-04. Output mặc định hiện ở `docs/tests/frontend/phase-04/`, có thể đổi bằng `L2_UI_OUTPUT_DIR`; giữ nguyên evidence các phase trước. Loading dùng trì hoãn request thật; lỗi400/409 do Express thật,503 bằng backend offline hoặc đầy session thật. Test timeout E08 để API thật commit rồi giữ phản hồi quá10 giây; không giả response nghiệp vụ.

FE-03 dùng `components/intake/` và `src/lib/intake-validation.ts`: giữ phone raw riêng với kết quả masked, serial exact giữ case/số0, ngày mua nullable và tháng bảo hành từ server. E03/E05 phân trang theo metadata; đổi khách/thiết bị xóa lựa chọn và preview cũ. Khi POST mất phản hồi, người dùng tra cứu GET trước khi gửi thêm; không tự POST lại. Mỗi vùng có trạng thái tải/rỗng/lỗi riêng.

FE-04 dùng ClassificationForm/WarrantyPreview/TicketReceipt và `src/lib/ticket-validation.ts`: mô tả1–2000 code point sau trim, chọn nhóm/ưu tiên rõ ràng, danh mục và preview tải độc lập. E08 chỉ gửi6 field contract; server tính snapshot và hạn. Sau201 khóa bản nhập, hiện mã/ID/trạng thái/hạn từ response; thời gian hiển thị dd/MM/yyyy HH:mm tại Asia/Ho_Chi_Minh. Hủy nhập có xác nhận khi có dữ liệu; không xóa customer/device đã lưu. Khi POST chưa rõ kết quả, giữ bản nhập và không gửi lại; nếu có ID có thể mở chi tiết để kiểm tra.

Harness `src/backend/scripts/ui-test.ts` có sản phẩm phân trang, catalog rỗng, nhóm sự cố ngừng và clock nghiệp vụ chỉ cho fixture/schema test cách ly. Auth vẫn dùng giờ thật; restart test khôi phục clock/catalog. Không đổi config demo, seed, API hoặc nghiệp vụ backend. Xem [kế hoạch](../../docs/plans/frontend-l2-implementation-plan.md), [FE-01](../../docs/progress/frontend/phase-01.md), [FE-02](../../docs/progress/frontend/phase-02.md), [FE-03](../../docs/progress/frontend/phase-03.md) và [FE-04](../../docs/progress/frontend/phase-04.md). Danh sách/chi tiết hoàn thiện ở FE-05; phê duyệt/trao đổi ở FE-06; thị giác toàn bộ ở FE-07.
