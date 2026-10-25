# FE-01 — Củng cố nền tảng và khung giao diện

Ngày thực hiện: **25/10/2026**. Trạng thái: **HOÀN THÀNH phạm vi FE-01**. Dừng tại đây; **FE-02–07 chưa bắt đầu**.

## 1. Phạm vi được giao

Sinh viên yêu cầu bắt đầu giai đoạn 1 theo [kế hoạch frontend](../../plans/frontend-l2-implementation-plan.md), với điều kiện API hiện có đáp ứng phương án mặc định. Kết luận: **chưa cần thay API** cho FE-01 hoặc phương án mặc định của lộ trình. Những chức năng WF01 vượt E09 vẫn theo GAP trong [đặc tả](../../plans/frontend-l2-screen-spec.md), không được mở quyền/list/filter mới trong phase này.

Đã đọc AGENTS ở root/frontend, ba tài liệu kế hoạch, code/frontend tests/harness, API/phụ lục liên quan, quyết định backend và TD-13/14. Đã đọc tài liệu Next cài tại `node_modules/next/dist/docs/01-app/` về layout/page, server/client, linking/navigation và dynamic route params. Không chạy Git.

## 2. Trạng thái đầu vào và thay đổi

**IMPLEMENTATION đầu vào:** frontend Phase 6 có login và các form nghiệp vụ thật, gom trong `l2-app.tsx`; chuyển màn hình bằng state. Client giữ Bearer RAM nhưng 401 chưa phân biệt A01 và response cũ có thể ảnh hưởng phiên mới. Baseline TypeScript/lint và 12 client tests đạt.

| Thành phần/file | Thay đổi FE-01 |
| --- | --- |
| `app/(mekong-mobile)/layout.tsx` | Gắn một SessionProvider và AppShell dùng chung, bỏ main lồng ngoài shell |
| `app/(mekong-mobile)/login/page.tsx`, `intake/page.tsx`, `tickets/page.tsx`, `tickets/[ticketId]/page.tsx` | Route UI thật; dynamic page đọc params/searchParams theo Promise của Next hiện cài |
| `src/components/l2-app.tsx`, `screens/home-screen.tsx` | Giữ entry cũ bằng re-export, chuyển `/` theo phiên/vai trò |
| `components/auth/session-provider.tsx`, `session-guard.tsx` | Một API client ổn định, phiên RAM, login/logout/401, return path nội bộ, guard role trước khi render child |
| `components/layout/app-shell.tsx`, `app/globals.css` | Topbar/sidebar, vùng main/footer, skip link/focus, CSS variables đơn sắc, sidebar184px/topbar64px ở desktop và điều hướng ngang mobile |
| `components/screens/` | Login, intake, hàng chờ/mở ID, detail gắn với route; giao diện vẫn kế thừa form thật từ Phase 6 |
| `components/legacy/intake-forms.tsx`, `legacy/ticket-detail.tsx` | Tách các form cũ để tiếp tục dùng, không viết lại quy tắc nghiệp vụ; heading reception đổi h1→h2 để giữ thứ bậc |
| `src/hooks/use-remote.ts`, `components/ui/read-state.tsx`, `src/lib/labels.ts` | Tách hook tải, lỗi/retry và nhãn bảo hành/phê duyệt dùng chung; bỏ kết quả thuộc load/filter cũ |
| `src/lib/navigation.ts` | Route mặc định theo role, ID an toàn và whitelist return path; không nhận URL ngoài/query/token hoặc suy ID từ ticket_code |
| `src/lib/api-client.ts` | Version phiên chặn response cũ trước/sau decode; logout vô hiệu kết quả login đang chạy; 401 A01 ở form, không gửi token cũ vào login |
| `tests/api-client.test.ts` | Giữ 12 test cũ, thêm6 test credential/session race/return path |
| `tests/browser/l2.spec.ts` | Chuyển selector button→link đúng điều hướng mới, chờ đúng trang dữ liệu; giữ assertion nghiệp vụ cũ, thêm2 kịch bản FE-01 và ảnh1280/768/375px |
| README root/frontend, kiến trúc, TD-15, kế hoạch | Ghi route/vị trí code, nơi lưu evidence và tiến độ thật |

Nghiệp vụ được giữ: lookup/tạo khách, chọn/tạo thiết bị, phân loại/preview/tạo phiếu, detail, lịch sử/ghi trao đổi và duyệt ngoại lệ. Intake tạm giữ hai bước local như trước; tạo thành công chuyển route detail. Hàng chờ giữ filter/page qua query UI an toàn và link quay lại từ detail.

## 3. Căn cứ và các quyết định

| Phân loại | Căn cứ/quyết định |
| --- | --- |
| SOURCE | BT2 Mục 2.3, trang PDF4: client riêng, login, ≥3 màn hình API thật và loading/empty/error. Nội dung đã được đối chiếu ở lần lập kế hoạch |
| DESIGN | SRS FR01–08/US01–08; UC01–05, UC07 phê duyệt, UC11 tạo khách, UC06 trao đổi; API A01/E01–E13, AUTH và TD-13 |
| DESIGN | Wireframe page14:2 đã khảo sát qua Figma Console trong lần lập kế hoạch; FE-01 dùng cấu trúc topbar/sidebar và sắc xám, chưa triển khai đầy đủ bố cục các form |
| IMPLEMENTATION | Client/provider/guard và các route đã build; API/PostgreSQL thật được kiểm qua harness; kết quả Mục4 |

- **Giữ API hiện có:** QL dùng E09 chỉ với CHUA_XAC_MINH và hai filter chờ/đã duyệt, cũ trước. NV không gọi E09; trang `/tickets` của NV là form mở ID qua E10. Không tìm theo phone/ticket_code, không N+1 E10 để bổ sung cột summary.
- **Giữ phiên trong layout:** dùng Link/router nội bộ để giữ provider; reload/tab mới cần login. Không cookie/localStorage/sessionStorage. Guard UI hỗ trợ trải nghiệm; backend vẫn kiểm role/center từng request.
- **Response cũ:** version phiên là chi tiết client, `STALE_REQUEST` không phải error code backend mới. Không tự retry POST, không thay payload/enum. Logout chỉ bỏ phiên client; chưa có API revoke.
- **Giữ code nghiệp vụ cũ:** tách vào `legacy/` để cô lập phạm vi refactor nền tảng. Các giới hạn cũ về form/phân trang/Unicode/snapshot presentation vẫn phải hoàn thiện đúng phase sau; không tự làm toàn bộ FE-02–07 trong FE-01.
- **Tên/ID:** header dùng employee_id/center_id từ principal; không giả tên nhân viên/trung tâm và không đưa config backend vào client.
- **Bố cục so với TD-13:** có route detail riêng, hai bước intake cùng route; phần ghép form thành bố cục WF02 hoàn chỉnh thuộc FE-03/04. Ghi riêng [TD-15](../../thay-doi-thiet-ke.md), không sửa lịch sử TD-13 hoặc gán phê duyệt giảng viên.

## 4. Kiểm chứng thực tế

Các lệnh dưới chạy từ root project, trừ khi ghi khác.

| Kiểm chứng | Kết quả | Bằng chứng/giới hạn |
| --- | --- | --- |
| Baseline `npm --prefix src/frontend run typecheck` | PASS | Trước sửa |
| Baseline `npm --prefix src/frontend run lint` | PASS | Trước sửa |
| Baseline `npm --prefix src/frontend test` | PASS | 12/12 test |
| Baseline `npm --prefix src/frontend run build` | PASS sau xử lý quyền môi trường | Hai lượt đầu bị EPERM trong `.next`; chạy lại với quyền ghi phù hợp thì đạt; không đổi config/build dependency để né lỗi |
| Sau sửa `npm --prefix src/frontend run typecheck` | PASS | Strict TS, cả routes/tests mới |
| Sau sửa `npm --prefix src/frontend run lint` | PASS | ESLint, không bỏ rule hoặc ép any |
| Sau sửa `npm --prefix src/frontend test` | PASS | 18/18, 0 fail/skip;6 test mới F-U13–18 |
| Sau sửa `npm --prefix src/frontend run build` | PASS | `/`, `/login`, `/intake`, `/tickets` static; `/tickets/[ticketId]` dynamic; proxy và alias cũ còn |
| `npm run test:ui` | PASS | 6/6, 0 fail; Next production + Express/PostgreSQL thật, schema/credential/cổng cách ly |
| Bảo toàn public trong UI harness | PASS | Stdout thực: `UI_FIXTURE_PUBLIC_PRESERVED`, so SHA-256 hàng của7 bảng public trước/sau và dọn schema test riêng |
| Review ảnh1280/768/375px | PASS trong phạm vi shell | Đã xem ảnh receipt/detail/approval và shell mobile/tablet; không tràn ngang tại768/375 theo assertion browser |
| Full `npm test` ở root, backend suite riêng | NOT RUN trong FE-01 | Không đổi backend; regression API/DB liên quan được kiểm qua UI harness, chưa tuyên bố toàn suite mới đạt |
| Docker/clean-room/NFR03 | NOT RUN trong FE-01 | Giữ cho mốc tích hợp thích hợp; không suy từ build local thành đạt container |
| Toàn bộ FE-02–07/BT3 | NOT RUN | Chưa triển khai hoặc nghiệm thu các phase sau |

Lượt UI đầu trong môi trường hạn chế bị EACCES khi kết nối PostgreSQL local. Chạy lại với quyền kết nối phù hợp bằng cùng harness, không sửa DB/.env/credential.

Lượt UI đầu có kết nối thật:4 đạt/2 lỗi. UI02 đọc danh sách trước khi chuyển trang hoàn tất nên bấm Trang sau khi đã đến cuối; FE01-UI02 chưa tạo lịch sử navigation nên Back ra trang trắng trước trang test. Đã sửa chờ đúng page và tạo lịch sử client thật, **giữ các assertion**, chạy lại6/6 đạt. Đây là sửa test theo điều hướng mới, không che lỗi backend.

### Kiểm tra trình duyệt đã đạt

1. UI01:100 lookup trên fixture200 phiếu, 1 warm-up riêng; **100/100 dưới1500ms**, p95≈48,2ms, max≈49,9ms. Dữ liệu máy/browser/raw tại [nfr01-local.json](../../tests/frontend/phase-01/nfr01-local.json). Đây là regression local, không phải nghiệm thu toàn FE-07 hoặc đo tải production.
2. UI02: thiếu ngày mua → tạo MOI → ghi trao đổi → QL duyệt; giữ due_date/MOI, phone theo quyền; double click tạo chỉ phát1 POST.
3. UI03: loading/empty/error/retry, tắt backend thật rồi phục hồi cho các vùng hiện có.
4. UI04: scope, điều hướng theo quyền, backend restart làm phiên cũ401, UI375px và storage rỗng.
5. FE01-UI01: protected URL chưa login không tải API riêng, Link giữ document/provider, NV không gọi E09; reload mất phiên; QL không gọi catalog NV; một main.
6. FE01-UI02: URL detail trước login quay về đúng ID sau login; mở ID bằng UI; logout/Back không phục hồi detail hoặc dữ liệu phiên trước.

## 5. Minh chứng và bảo toàn phạm vi

Output mới tại [docs/tests/frontend/phase-01](../../tests/frontend/phase-01/verification.md). Đã xem trực tiếp:

- [Khung desktop](../../tests/frontend/phase-01/fe01-shell-desktop.png), [768px](../../tests/frontend/phase-01/fe01-shell-768.png), [375px](../../tests/frontend/phase-01/fe01-shell-375.png).
- [Tiếp nhận kế thừa](../../tests/frontend/phase-01/screen-1-reception.png), [chi tiết NV](../../tests/frontend/phase-01/screen-2-ticket.png), [đã duyệt QL](../../tests/frontend/phase-01/screen-3-approval.png).

Ảnh nghiệp vụ dùng fixture mô phỏng cách ly. Không dùng làm bằng chứng giống hoàn toàn Figma; thời điểm/ID là kết quả server thực của lượt test.

Đã so hash filesystem với snapshot trước thay đổi: backend source/tests/migrations/config, package/lockfile hai phía/root, contract/SRS/schema, AGENTS và toàn bộ `docs/tests/results/` cũ không đổi. Không sửa .env/credential/AI disclosure hoặc tài liệu nguồn; không thêm dependency; không Git/commit/push.

## 6. Giới hạn và điểm dừng

FE-01 hoàn thành nền tảng. Login hiện mới kế thừa form cơ bản; show/hide password, validation/UX đầy đủ thuộc FE-02. Intake vẫn hai bước, chưa ba cột, chưa phân trang E03/E05 đầy đủ và chưa mở rộng recovery/Unicode theo FE-03/04. Chi tiết giữ form cũ, chưa tách lỗi từng vùng/phân trang sau ghi theo FE-05/06. Định dạng status/time hiện còn giá trị thô ở một số vùng; hoàn thiện ở phase tương ứng.

Các giới hạn API/wireframe GAP vẫn được giữ. Không có blocker FE-01 còn tồn tại sau kiểm chứng; chưa chạy Docker hoặc toàn bộ backend suite lại trong phase này. Sinh viên cần tự xem/review sản phẩm và ghi xác nhận cá nhân khi có; Codex không xác nhận thay. Không tự sửa AI disclosure.

**Dừng sau FE-01.** Phase tiếp theo khi được giao là FE-02 — hoàn thiện màn hình đăng nhập.
