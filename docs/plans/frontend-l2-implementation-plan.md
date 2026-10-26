# Kế hoạch triển khai Frontend L2 — Mekong Mobile

Ngày lập: **25/10/2026**. Cập nhật thực thi: **FE-01–07 hoàn thành ngày 25/10/2026**. Xem [FE-01](../progress/frontend/phase-01.md), [FE-02](../progress/frontend/phase-02.md), [FE-03](../progress/frontend/phase-03.md), [FE-04](../progress/frontend/phase-04.md), [FE-05](../progress/frontend/phase-05.md), [FE-06](../progress/frontend/phase-06.md) và [FE-07](../progress/frontend/phase-07.md) cho kết quả thực tế; nội dung các phase bên dưới được giữ để truy vết kế hoạch ban đầu.

Mục tiêu: hoàn thiện **màn hình đăng nhập và ba màn hình nghiệp vụ** theo wireframe Figma, sử dụng backend L2 hiện có, để Codex có thể thực hiện từng giai đoạn độc lập và kiểm chứng được.

## 1. Cách dùng bộ kế hoạch

Đọc theo thứ tự:

1. Tài liệu này: phạm vi, kiến trúc, thứ tự triển khai và điều kiện kết thúc từng giai đoạn.
2. [Đặc tả màn hình và ánh xạ API](frontend-l2-screen-spec.md): hành vi từng màn hình, field, trạng thái và sai khác với Figma.
3. [Kế hoạch kiểm chứng và truy vết](frontend-l2-verification-plan.md): test, NFR, minh chứng và mẫu báo cáo.

**Quy ước cho Codex khi được giao triển khai sau này:**

- Đọc `AGENTS.md` ở root và trong phạm vi file sắp sửa; kiểm tra hiện trạng file bằng công cụ đọc filesystem, **không chạy Git** theo quy định hiện hành của project.
- Đọc API/SRS/decision log liên quan; xác minh lại implementation vì repo có thể thay đổi sau ngày lập kế hoạch.
- Chỉ làm **giai đoạn người dùng giao**, hoàn thành kiểm chứng và báo cáo, rồi dừng. Việc lập kế hoạch không tự cấp lệnh triển khai.
- Không sửa `sources/`, `ref/`, API Contract, SRS, migration, seed hoặc backend để làm giao diện khớp hình minh họa.
- Không commit/push, thay dependency, dựng module CRM khác hoặc sửa `docs/ai-disclosure.md` khi chưa được giao.
- Không dùng số test/kết quả PASS của Phase 6 backend để báo PASS cho frontend mới.

Các tên component/file mới dưới đây là **PROPOSAL**: được điều chỉnh cục bộ cho phù hợp convention thực tế, nhưng không thay hành vi hay API đã chốt. Những khác biệt ảnh hưởng baseline phải được ghi nhận và xin quyết định trước khi hiện thực phần phụ thuộc.

## 2. Căn cứ và kết quả khảo sát

### 2.1. Phân loại căn cứ

| Nhóm | Tài liệu đã đối chiếu | Nội dung dùng trong kế hoạch |
| --- | --- | --- |
| SOURCE | Case Study Mekong Mobile — Mục 4, 5.1, 6.1–6.2, 7/L2, 8, 9/Bảng 9.1, 11 — trang PDF 6, 8, 10–12, 15–16, 19, 22–23 | Tiếp nhận, ngoại lệ thiếu ngày mua, phạm vi L2, dữ liệu, QT-01–06 và QT-13–15 |
| SOURCE | Đề BT2 — Mục 2.1–2.3, 2.5, 4.2 — trang PDF 3–5, 8 | ≥3 màn hình gọi API thật, client riêng, login cơ bản, loading/empty/error, test và ghi sai khác thiết kế |
| SOURCE | Phiếu phạm vi — Mục 2–6 — trang PDF 1 | L2, prototype cá nhân, 100–200 phiếu và stack dự kiến |
| DESIGN | [SRS](../srs.md) — Mục 4–7; bảng truy vết Mục 6, trang ghi trong tài liệu 21 | FR01–FR08, US01–US08, UC01–UC07/UC11, NFR01–03 |
| DESIGN | [API Contract](../api-contract-l2.md) — E01–E13, Mục 9–11 | Payload, quyền, lỗi, phân trang và kết quả nghiệp vụ |
| DESIGN | [Phụ lục API](../api-contract-l2-extension.md) — A01, quy ước Unicode, CRUD | Login, giới hạn input, phụ lục thiết bị mới; không thêm CRUD UI vào kế hoạch mặc định |
| DESIGN | [Decision log backend](../progress/backend/decision-log.md), [thay đổi thiết kế](../thay-doi-thiet-ke.md) — TD-07–TD-14 | Các DD/AUTH đã được sinh viên chấp thuận, thích ứng wireframe ở TD-13 |
| DESIGN | Figma, ba frame tại Mục 2.2 | Cấu trúc, phân vùng, thứ bậc nội dung và tương tác dự kiến |
| IMPLEMENTATION | `src/frontend/`, `src/backend/src/routes/`, [kiến trúc thực tế](../architecture-thuc-te.md) | Frontend tối thiểu đã có; backend có login và E01–E13; kết luận từ đọc code, không phải lần chạy test mới |

PDF nguồn được đọc từ thư mục Project đồng bộ `C:/Users/buith/.codex/.chatgpt-projects/g-p-6ab4ea4708e881919df5b65663772419/ref/`. Repo hiện không có `sources/` hoặc `ref/` tại root. Không sao chép hay sửa PDF nguồn khi lập kế hoạch.

### 2.2. Wireframe đã xác minh qua Figma Console

- File: **Mekong Mobile - L2 - 3 Wireframe tĩnh**, key `IYbByIdGl6ksmlp1Yvxld7`.
- Page đang mở: **L2 • 3 Wireframe tĩnh 2**, node `14:2`; container `14:3`.
- [WF01 — Danh sách phiếu bảo hành](https://www.figma.com/design/IYbByIdGl6ksmlp1Yvxld7?node-id=14-6): node `14:6`.
- [WF02 — Tiếp nhận và tạo phiếu](https://www.figma.com/design/IYbByIdGl6ksmlp1Yvxld7?node-id=14-158): node `14:158`.
- [WF03 — Chi tiết và phê duyệt](https://www.figma.com/design/IYbByIdGl6ksmlp1Yvxld7?node-id=14-268): node `14:268`.
- Ba frame đều **1920 × 1080**. Thanh trên cao 64px, sidebar rộng 184px. Phần ghi chú học thuật nằm bên dưới vùng ứng dụng, **không đưa nguyên vào giao diện chạy thật**.
- File còn page **L2 • 3 Wireframe tĩnh**, node `3:2`, có bộ cũ và nhãn UC khác SRS. Dùng page `14:2` làm tham chiếu thị giác, giữ mapping UC theo SRS/decision log hiện hành.
- Chưa có frame login trong hai page đã đọc; login dưới đây là **PROPOSAL**, dùng cùng ngôn ngữ thị giác.
- Tìm component trong file trả về rỗng. Không giả định tồn tại component library hoặc design token đã công bố.
- Đã đọc text/hierarchy và xem ảnh live của cả ba frame; không chỉnh Figma. Các node ID phải được tìm lại khi phiên sau dùng Figma Console.

### 2.3. Hiện trạng cần kế thừa

| Thành phần | Hiện trạng đã đọc | Hướng xử lý |
| --- | --- | --- |
| Stack | Next 16.4.2, React 19.3.0, TypeScript; npm/lockfile hiện hữu | Giữ nguyên; không thêm UI kit/state manager/form library mặc định |
| Entry | `app/(mekong-mobile)/page.tsx` render `src/components/l2-app.tsx` | Tách dần component và điều hướng, giữ hành vi đang có |
| UI hiện tại | Login + khách/thiết bị + tạo phiếu/trao đổi + hàng chờ/chi tiết QL | Đã có chức năng tối thiểu nhưng khác cách chia ba màn hình Figma |
| Client | `src/lib/api-client.ts`, `contracts.ts`: token RAM, DTO decoder, lỗi, timeout | Tái sử dụng; bổ sung đúng phần UI cần như tham số E03/E05, `existing_device`, xử lý request cũ |
| Proxy | `app/api/[...path]/route.ts`, cùng origin `/api` | Giữ làm proxy HTTP; không chứa quy tắc/SQL |
| Tests | Node test runner cho client, Playwright và harness API/PostgreSQL riêng | Giữ công cụ, cập nhật selector theo cấu trúc mới, bảo toàn các assertion nghiệp vụ |
| Scripts | Frontend có `typecheck`, `lint`, `test`, `build`, `test:ui`; root có `test`, `test:ui` | Dùng đúng scripts và điều kiện harness, xem tài liệu kiểm chứng |

## 3. Phạm vi mặc định và các giới hạn đã biết

### 3.1. Bốn màn hình đích

| Màn hình | Người dùng | Kết quả cần đạt |
| --- | --- | --- |
| Login | Chưa xác thực | A01 cấp phiên thật, điều hướng theo principal |
| WF01 — Danh sách/hàng chờ | QL; NV chỉ có lối mở phiếu bằng ID | QL xem hàng chờ/đã duyệt mà E09 cho phép; không giả lập danh sách NV |
| WF02 — Tiếp nhận và tạo phiếu | NV | Tra cứu/tạo khách, chọn/tạo thiết bị, phân loại, kiểm bảo hành và tạo phiếu trong một màn hình |
| WF03 — Chi tiết và phê duyệt | NV/QL theo quyền | Xem snapshot và trao đổi; NV ghi trao đổi, QL phê duyệt ngoại lệ |

**PROPOSAL:** gộp khách/thiết bị và tạo phiếu về WF02, tách chi tiết thành WF03, kế thừa nền tảng Phase 6. Đây là kế hoạch thay đổi bố cục so với TD-13, chưa phải thay đổi đã triển khai. Khi thực hiện, ghi nhận rõ việc bố trí lại trong `docs/thay-doi-thiet-ke.md`; không viết lại lịch sử TD-13 hoặc tự gán phê duyệt giảng viên.

### 3.2. Phương án triển khai được ngay với API hiện có

Các lựa chọn sau thuộc **PROPOSAL thích ứng frontend**, được tách rõ khỏi đặc tả gốc:

1. WF01 của QL đặt tên **“Phiếu chưa xác minh bảo hành”**, hai lựa chọn **Chờ phê duyệt / Đã phê duyệt**. E09 không phải danh sách mọi phiếu.
2. NV đăng nhập vào WF02. Có lối **“Mở phiếu bằng ID”** dùng E10; sau tạo phiếu thì mở WF03 từ `ticket_id` response. Không gọi E09 bằng tài khoản NV.
3. Bảng WF01 chỉ dùng field E09 trả về; không có tìm mã/phone, lọc ưu tiên hoặc tab “Tất cả/Mới”. Giữ phân trang và thứ tự cũ trước do server cung cấp.
4. Chưa có API đọc status log, SLA preview, tên nhân viên/trung tâm hoặc danh mục cho QL. Giao diện dùng fallback ID và thời điểm thật đang có; không tạo timeline, tên người hay hạn cam kết giả.

Chi tiết từng khác biệt và ảnh hưởng nằm ở Mục 2 của [đặc tả màn hình](frontend-l2-screen-spec.md). Không coi các giới hạn này là lỗi cần tự sửa backend.

### 3.3. Nếu yêu cầu khớp đầy đủ WF01 gốc

Đây là nhánh **ngoài phạm vi mặc định**, cần quyết định riêng của sinh viên **trước khi viết code phụ thuộc**:

- Mở quyền danh sách NV theo trung tâm, mở tập phiếu và field summary cần thiết.
- Đặc tả tìm mã/phone, lọc trạng thái/ưu tiên, sort; xác định response/meta và kiểm soát phone.
- Cân nhắc dữ liệu tên tham chiếu, status log và preview thời gian nếu vẫn cần hiển thị như hình.
- Ghi thay đổi SRS/contract/trace/test tương ứng theo ủy quyền riêng, rồi cập nhật bộ kế hoạch này.

Không cần quyết định nhánh mở rộng để thực hiện phương án API hiện có. Kế hoạch này **không tuyên bố giao diện sẽ giống toàn bộ hành vi WF01 gốc**.

Ngoài phạm vi cả hai nhánh nếu chưa được giao: phân công/sửa chữa/linh kiện/đóng phiếu, báo cáo, quản trị user, gửi email/SMS, cloud, JWT/refresh token, CRUD UI khách/thiết bị đầy đủ. Bốn PATCH/DELETE đã có ở backend không tự tạo thêm màn hình quản trị.

## 4. Kiến trúc frontend đề xuất

### 4.1. Điều hướng và trạng thái phiên

Giữ App Router trong route group hiện hữu. Các URL dưới đây là **route giao diện đề xuất**, không phải endpoint backend mới:

| Route UI | Quyền/hành vi |
| --- | --- |
| `/` | Điều hướng theo phiên: chưa login → `/login`; NV → `/intake`; QL → `/tickets` |
| `/login` | Form A01; phiên hợp lệ đã có thì về trang theo vai trò |
| `/tickets` | QL: E09; NV: vùng nhập `ticket_id` để mở WF03, không tải E09 |
| `/intake` | NV: WF02; QL: thông báo không đủ quyền, không gọi API intake |
| `/tickets/[ticketId]` | NV/QL đọc E10/E12; thao tác ghi theo vai trò |

- Một `SessionProvider` client ở layout chung route group, sở hữu một API client ổn định và principal; không tạo client/token riêng cho mỗi page.
- Token chỉ ở RAM như hiện tại; không cookie/localStorage/sessionStorage hoặc URL. Đổi trang bằng điều hướng client để giữ phiên; refresh/tab mới cần login lại.
- Guard UI chạy ở client vì server không có token RAM; trong lúc xác định phiên không render dữ liệu riêng. Backend vẫn là nơi kiểm quyền bắt buộc.
- Khi vào URL chi tiết chưa login: chỉ giữ return path nội bộ đã kiểm tra theo các route trên; sau login kiểm lại vai trò. Không chấp nhận redirect ra ngoài hoặc query chứa phone/token.
- 401 từ API có xác thực: xóa token, principal, draft, cache dữ liệu và request cũ; đưa về login với lý do rõ ràng. A01 `INVALID_CREDENTIALS` là lỗi tại form, không hiện thông báo hết phiên.
- Đăng xuất chỉ xóa phiên phía client; backend chưa có revoke/logout endpoint. Không mô tả đây là thu hồi token server.
- Dùng generation/session identity để response cũ không ghi vào giao diện sau đổi khách, đổi phiếu, logout hoặc login bằng tài khoản khác. Abort nếu hỗ trợ, nhưng vẫn cần guard kết quả cũ.

Trước khi code routing, đọc tài liệu **cài trong project** tại `src/frontend/node_modules/next/dist/docs/01-app/`: `01-getting-started/03-layouts-and-pages.md`, `04-linking-and-navigating.md`, `05-server-and-client-components.md` và `03-api-reference/03-file-conventions/dynamic-routes.md`. Không mặc định API theo phiên bản Next khác.

### 4.2. Cấu trúc file dự kiến

```text
src/frontend/
  app/(mekong-mobile)/
    layout.tsx                  # layout chung + provider, tránh lồng nhiều main
    page.tsx                    # entry theo phiên
    login/page.tsx
    tickets/page.tsx
    tickets/[ticketId]/page.tsx
    intake/page.tsx
  app/api/[...path]/route.ts     # proxy hiện có
  src/components/
    auth/session-provider.tsx
    auth/session-guard.tsx
    layout/app-shell.tsx
    ui/                         # field, notice, badge, async-state, pagination
    screens/login-screen.tsx
    screens/ticket-list-screen.tsx
    screens/intake-screen.tsx
    screens/ticket-detail-screen.tsx
    intake/                     # customer, device, classification, summary
    tickets/                    # summary, communications, approval
  src/lib/
    api-client.ts               # HTTP tập trung, giữ public API đang dùng
    contracts.ts                # types + runtime decoding
    labels.ts                   # nhãn enum, không chứa dữ liệu nghiệp vụ mẫu
    format.ts                   # ngày/giờ và định dạng trình bày
    validation.ts               # hỗ trợ UX, backend vẫn quyết định
  tests/api-client.test.ts
  tests/browser/l2.spec.ts
```

Không tạo mọi thư mục ngay từ đầu nếu chưa dùng. Tách theo trách nhiệm đủ nhỏ để đọc và giải thích; không xây design system hoặc generic form engine. Có thể giữ `l2-app.tsx` làm entry trong quá trình chuyển đổi; chỉ bỏ phần đã được thay và kiểm regression.

### 4.3. Quy tắc API và dữ liệu

- Component gọi các hàm client; không `fetch` trực tiếp, không đọc config private/backend hoặc truy cập DB.
- Tái sử dụng `{data}`, `{data,meta}`, `{error:{code,message,fields}}` và decoder hiện có. Không đổi snake_case/enum/payload server để thuận tiện render.
- Bổ sung E03 nhận `serial_no/page/size`, E05 nhận `page/size` khi cần; luôn phân trang đúng, không coi `size=100` là toàn bộ dữ liệu.
- Bổ sung đọc `error.existing_device` đúng schema khi gặp `SERIAL_ALREADY_EXISTS`; chỉ chọn nếu cùng customer hiện tại. `existing_customer`/`existing_device` không có trong lỗi thì không cố lấy hồ sơ ngoài quyền.
- Mỗi vùng tải độc lập có loading/empty/error/retry; lỗi trao đổi không làm biến mất toàn bộ chi tiết phiếu.
- Không auto retry POST. Timeout có thể xảy ra sau khi server đã ghi; xem đặc tả xử lý kết quả chưa xác định trước khi cho gửi lại.
- Giữ `NEXT_PUBLIC_L2_API_BASE=/api`, `L2_API_PROXY_TARGET` chỉ phía Next server. Không đưa credential/config tài khoản lên bundle.

## 5. Lộ trình bảy giai đoạn

Thứ tự mặc định: **FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07**. Mỗi giai đoạn kết thúc bằng báo cáo `docs/progress/frontend/phase-XX.md`. Tạo thư mục báo cáo khi bắt đầu thực hiện, không tạo báo cáo PASS trước.

### FE-01 — Củng cố nền tảng và khung giao diện

**Đầu vào:** bộ kế hoạch, code/frontend tests hiện có, TD-13 và tài liệu Next cục bộ.

**Công việc:**

1. Chạy các kiểm tra frontend không cần DB để ghi baseline; đọc test/harness trước khi thay cấu trúc.
2. Tách session, nhãn enum và trạng thái tải dùng chung khỏi `l2-app.tsx`; giữ một client, các hành vi cũ và token RAM.
3. Dựng app shell theo Figma: topbar, sidebar theo quyền, vùng nội dung, focus và breakpoint; login không dùng sidebar.
4. Chuẩn bị route/provider tại Mục 4. Di chuyển hành vi hiện có sang route tương ứng bằng component kế thừa; trang chưa được hoàn thiện thị giác phải dùng chức năng thật hiện có.
5. Tạo CSS variables cơ bản từ Figma; không tải font/asset hoặc thêm dependency mới mặc định.
6. Ghi nhận đề xuất bố trí lại ba màn hình khi thực thi; ghi rõ chênh lệch Figma/API theo phương án mặc định.

**File dự kiến:** layout/page trong route group, `l2-app.tsx`, `components/auth/`, `components/layout/`, UI chung, `globals.css`, tài liệu sai khác/báo cáo. Không đổi root scripts/proxy nếu không cần.

**Nghiệm thu:** chức năng tối thiểu cũ còn truy cập được; chuyển trang client giữ phiên; reload/logout xóa phiên đúng; không nhấp nháy nội dung sai quyền; TypeScript/lint/client tests/build đạt. Ghi chính xác phần browser test chưa chạy hoặc selector cần chuyển; không xóa test để tạo baseline xanh.

**Điểm dừng:** chưa hoàn thiện nghiệp vụ mới hoặc bổ sung API. Nếu có lỗi baseline có sẵn, ghi riêng và đánh giá ảnh hưởng trước khi quy thành lỗi thay đổi.

### FE-02 — Hoàn thiện màn hình đăng nhập

**Phụ thuộc:** FE-01. **Căn cứ:** A01, AUTH, BT2 Mục 2.3; không tạo FR/US login mới.

**Công việc:** form username/password, hiển thị/ẩn mật khẩu, validation đúng Unicode, busy/error/retry, thông báo hết phiên, điều hướng theo role/return path an toàn. Giữ password nguyên khoảng trắng; không role selector hoặc credential điền sẵn. Xử lý 400, 401 sai credential, 503 và mất kết nối.

**File dự kiến:** `login/page.tsx`, login screen, provider/guard, client tests/browser test liên quan.

**Nghiệm thu:** NV vào tiếp nhận, QL vào hàng chờ; login lỗi ở lại form và giữ username; keyboard/Enter hoạt động; không gửi lặp khi busy; token/password không có trong storage/URL/log; đăng xuất/401 dọn mọi dữ liệu của phiên trước.

**Kiểm chứng:** frontend checks; browser login hai vai trò, sai credential, refresh, URL trực tiếp, server restart theo harness.

### FE-03 — WF02: Khách hàng và thiết bị

**Phụ thuộc:** FE-02. **Căn cứ:** FR01/02/07, US01/02/07, UC01/02/11, E01–E05; QT-01/02/03/14/15, DD07 và AC thiết bị mới trong phụ lục.

**Công việc:**

1. Gộp hai vùng khách/thiết bị vào WF02; lookup theo phone, kết quả masked, không tìm thấy thì tạo khách trong cùng màn hình.
2. Giữ số đã tra cứu cho nhánh tạo; chống kết quả lookup cũ áp vào số mới; xử lý 409 dùng hồ sơ có sẵn khi API trả.
3. Danh sách/chọn thiết bị với E03, lookup serial exact và phân trang server; không đổi case, ép số hoặc kiểm IMEI 15 chữ số cho mọi serial.
4. Nhánh tạo thiết bị: product E05, serial, ngày mua nullable; tháng bảo hành do server cấp. Xử lý trùng serial cùng chủ/khác chủ và catalog rỗng.
5. Đổi khách phải bỏ chọn thiết bị/kết quả bảo hành của khách cũ; đổi thiết bị bỏ preview cũ. Không tự đổi chủ hoặc sửa thiết bị có sẵn qua form tiếp nhận.

**File dự kiến:** intake page/screen, `components/intake/`, validation/client/decoder cần thiết và tests tương ứng.

**Nghiệm thu:** lookup/tạo khách → chọn/tạo thiết bị thật; thiếu tên/phone bị chặn; 409 không lộ dữ liệu ngoài scope; đủ loading/empty/error/retry; E03/E05 không bỏ sót trang; nhãn chủ sở hữu đúng customer. Chưa coi tạo phiếu là hoàn thành nếu FE-04 chưa thực hiện.

### FE-04 — WF02: Phân loại, bảo hành và tạo phiếu

**Phụ thuộc:** FE-03. **Căn cứ:** FR02–05, US02–05, UC02–05; E06–E08; QT-03–06, DD02/DD04–06/DD08.

**Công việc:** danh mục nhóm sự cố thật; mô tả và ưu tiên bắt buộc, không preselect; E07 preview theo ngày server; bảng tóm tắt; gửi E08 đúng payload. Không tự tính expiry/SLA, không cho sửa thời điểm/người tiếp nhận. Trước tạo, hạn cam kết hiển thị “Được xác định khi tạo phiếu”.

Sau 201 hiển thị mã/ID phiếu, status/warranty/approval/can_proceed và hạn từ response; có nút mở WF03/tạo tiếp. Thành công mới đánh dấu draft đã hoàn tất; không gửi lại cùng draft qua double click/back. Nhánh hết hạn vẫn tạo được theo DD02; thiếu ngày mua vẫn tạo MOI chờ duyệt.

**File dự kiến:** classification/summary trong intake, client/decoder khi cần, browser test chuyển tiếp.

**Nghiệm thu:** ba kết quả bảo hành đúng; không chọn ưu tiên hoặc mô tả toàn whitespace thì không tạo; count Unicode đúng; snapshot sau tạo khác preview nếu server thay ngày phải dùng response mới. Khách/thiết bị đã tạo ở FE-03 không bị “rollback giả” khi hủy draft phiếu.

**Kiểm chứng:** luồng còn hạn/hết hạn/thiếu ngày mua, validation, API lỗi giữ input, click lặp, POST timeout và biên ngày theo fixture server. Không suy từ ngày máy người chạy.

### FE-05 — WF01 và WF03: Danh sách, chi tiết chỉ đọc

**Phụ thuộc:** FE-04. **Căn cứ:** FR06/08, US06/08, UC07/06; E09/E10/E12; QT-14/15.

**Công việc:**

1. WF01 QL: chờ/đã duyệt, phân trang, tổng đúng meta, sort server, các cột có dữ liệu thật; giữ filter/page khi về từ chi tiết.
2. WF01 NV: vùng mở phiếu bằng ID dương an toàn; không list hoặc tìm ticket_code/phone. Entry mặc định NV vẫn là WF02.
3. WF03: bố cục chi tiết hai cột, snapshot bảo hành/SLA và ba loại trạng thái tách riêng; phone theo response backend.
4. Đọc lịch sử trao đổi phân trang cũ trước; có trạng thái rỗng/lỗi/thử lại độc lập. Không dựng status timeline hoặc tên nhân viên giả.
5. Link từ E08/WF01/ID nhập → chi tiết; return link theo role, không bắt NV về danh sách không có quyền.

**File dự kiến:** tickets pages, ticket list/detail screens, read-only ticket components, tests navigation/DTO nếu cần.

**Nghiệm thu:** QL không gọi các catalog chỉ dành NV; NV không gọi E09; E09 summary thiếu field không dẫn đến N+1 E10; 404 ngoài phạm vi không tiết lộ hồ sơ; reload cần login rồi mới fetch. Phân biệt chưa có trao đổi, bộ lọc không ra kết quả và lỗi mạng đúng dữ kiện API.

### FE-06 — WF03: Phê duyệt và ghi trao đổi

**Phụ thuộc:** FE-05. **Căn cứ:** FR06/08, US06/08, UC07/06, NFR02; E11/E13; QT-05/14.

**Công việc:**

- NV ghi content 1–2000 code point sau trim vào đúng ticket; server gán actor/time. QL chỉ đọc trao đổi.
- QL phê duyệt khi `MOI + CHUA_XAC_MINH + CHO_PHE_DUYET`; note tùy chọn 1–1000 sau trim hoặc null. Không có từ chối phê duyệt.
- Chỉ cập nhật xác nhận thành công từ API; đọc lại detail và làm mới hàng chờ khi quay về, giữ filter và xử lý trang cuối bị rỗng.
- 409 `ALREADY_APPROVED`/`APPROVAL_NOT_APPLICABLE`: tải lại trạng thái, không ghi đè người/thời điểm đầu. 401/403/404 xử lý riêng.
- Trao đổi lưu thành công nhưng tải lại lỗi: báo hai kết quả riêng, không giữ nút “lưu lại” như thể chưa ghi. Đến trang cuối E12 hoặc tải đúng trang chứa bản ghi mới theo `meta.total`.

**File dự kiến:** approval/communications components, client/error handling, tests liên quan.

**Nghiệm thu:** sau duyệt vẫn MOI/CHUA_XAC_MINH, due_date/snapshot giữ nguyên; approved_by/at từ response; NV không duyệt, QL không ghi trao đổi. Gửi sai quyền trực tiếp API bị từ chối và không đổi dữ liệu. Các POST không tự retry khi mạng gián đoạn.

### FE-07 — Hoàn thiện thị giác, regression và bàn giao

**Phụ thuộc:** FE-01–06 hoàn thành theo báo cáo thực tế. **Căn cứ:** BT2/S4, FR01–08, NFR01–03 và toàn bộ sai khác đã ghi nhận.

**Công việc:**

1. So sánh ảnh giao diện với ba frame Figma tại desktop; kiểm tablet/mobile, bàn phím, focus, overflow, label/error, độ dài dữ liệu.
2. Hoàn thiện state loading/empty/error/retry cho cả ba màn hình nghiệp vụ và login; tắt backend thật và phục hồi qua harness.
3. Chạy các kiểm tra theo tài liệu kiểm chứng; cập nhật selector mà giữ ý nghĩa assertion/fixture cách ly và đo NFR01.
4. Đo lại 100 lượt tra cứu/200 phiếu cho NFR01; kiểm API quyền NFR02; nếu thay đổi tác động build/route, smoke lại Compose theo README và NFR03.
5. Cập nhật README frontend/kiến trúc/sai khác thiết kế theo kết quả thật; tạo báo cáo và evidence mới ở nhánh thư mục frontend, giữ minh chứng Phase 6 cũ.
6. Đưa dự thảo nội dung khai báo AI cho sinh viên kiểm tra; không tự xác nhận sinh viên đã review và không tự sửa disclosure.

**Nghiệm thu:** bốn màn hình chạy với API thật; mọi tiêu chí truy vết có kết quả/giới hạn; các check bắt buộc đạt hoặc nêu rõ blocker. Không tuyên bố giống tuyệt đối Figma/đạt toàn bộ BT3 khi vẫn có giới hạn contract hoặc chưa đối chiếu đề BT3.

## 6. Quản lý tiến độ và cách giao việc

| Giai đoạn | Trạng thái cập nhật | Báo cáo tạo khi thực thi |
| --- | --- | --- |
| FE-01 | COMPLETE — 25/10/2026 | [phase-01.md](../progress/frontend/phase-01.md) |
| FE-02 | COMPLETE — 25/10/2026 | [phase-02.md](../progress/frontend/phase-02.md) |
| FE-03 | COMPLETE | [Báo cáo FE-03](../progress/frontend/phase-03.md) |
| FE-04 | COMPLETE | [Báo cáo FE-04](../progress/frontend/phase-04.md) |
| FE-05 | COMPLETE | [Báo cáo FE-05](../progress/frontend/phase-05.md) |
| FE-06 | COMPLETE | [Báo cáo FE-06](../progress/frontend/phase-06.md) |
| FE-07 | COMPLETE | [Báo cáo FE-07](../progress/frontend/phase-07.md) |

Ví dụ yêu cầu cho phiên sau:

> Triển khai FE-01 theo docs/plans/frontend-l2-implementation-plan.md. Đọc hai tài liệu đặc tả/kiểm chứng đi kèm, dùng phương án API hiện có tại Mục 3.2. Giữ các thay đổi hiện hữu, chạy kiểm tra phù hợp và ghi báo cáo phase-01. Dừng sau FE-01.

Không cần đọc lại toàn bộ PDF cho mỗi thay đổi CSS; khi thay hành vi nghiệp vụ/quyền/dữ liệu phải mở đúng nguồn và kiểm dependency liên quan. Nếu người dùng chọn mở rộng API để khớp WF01 gốc, cập nhật kế hoạch và baseline được duyệt trước phần triển khai phụ thuộc.

## 7. Kết quả của lần lập kế hoạch

Đã khảo sát code, API/SRS, hồ sơ quyết định, PDF nguồn liên quan và Figma live; tạo ba tài liệu kế hoạch trong `docs/plans/`. Không triển khai UI, không đổi backend/contract, không sửa tài liệu nguồn hoặc AI disclosure. Các kiểm thử chức năng trong bộ kế hoạch là **NOT RUN cho frontend dự kiến**; kết quả cũ chỉ là tham chiếu lịch sử.
