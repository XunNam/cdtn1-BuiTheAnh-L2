# Frontend L2 — Kế hoạch kiểm chứng và truy vết

Ngày lập: **25/10/2026**. Trạng thái lúc lập kế hoạch: **NOT RUN**. Kết quả thực thi được ghi riêng tại [FE-01](../progress/frontend/phase-01.md), [FE-02](../progress/frontend/phase-02.md), [FE-03](../progress/frontend/phase-03.md), [FE-04](../progress/frontend/phase-04.md); các mục phase sau vẫn là kế hoạch. Dùng cùng [lộ trình triển khai](frontend-l2-implementation-plan.md) và [đặc tả màn hình](frontend-l2-screen-spec.md).

Mã `FE-Txx` dưới đây là **nhóm kịch bản kiểm chứng đề xuất**, không phải mã test học phần đã được phê duyệt, không thay các TC/test hiện có và không chốt số lượng test của BT3.

## 1. Nguyên tắc thực thi

1. Xác minh scripts/config và trạng thái dependency khi bắt đầu mỗi giai đoạn. Không tự cài hoặc nâng framework/test runner nếu chưa cần.
2. Kiểm thay đổi theo phạm vi trước; chỉ chạy lại toàn bộ khi đạt mốc tích hợp hoặc có ảnh hưởng liên quan. Không viết unit test chỉ để sao chép từng dòng JSX/CSS.
3. Unit/client tests có thể dùng transport giả để kiểm DTO/lỗi/race; **minh chứng UI nghiệp vụ phải dùng API thật**. Không dùng mock response để báo đã tích hợp PostgreSQL.
4. Tái dùng `src/backend/scripts/ui-test.ts`: harness tạo schema/credential/cổng riêng và khởi chạy backend/Next production. Không test POST trên public database rồi xóa dữ liệu để phục hồi.
5. Không thay seed/schema/config/credential thật hoặc migration đã apply; không DROP/reset database/public. Thiếu môi trường/quyền thì ghi BLOCKED và lý do cụ thể.
6. Giữ ý nghĩa assertion cũ khi chuyển layout/route; selector theo label/role hoặc testid ổn định, không xóa assertion vì UI mới bố trí khác.
7. Với chức năng chỉ đổi trình bày, dùng kiểm tra thị giác/keyboard và frontend checks; giữ kiểm chứng nghiệp vụ ở service/backend đang có thay vì sao chép luật sang frontend.

## 2. Bộ lệnh đã xác minh có trong project

Các lệnh dưới chạy từ **root project**. Đây là hướng dẫn chạy trong giai đoạn thực thi, chưa phải kết quả lần lập kế hoạch.

| Lệnh | Khi dùng | Điều kiện/giới hạn |
| --- | --- | --- |
| `npm --prefix src/frontend run typecheck` | Mỗi phase có đổi TS/TSX | Dependency theo lockfile đã cài |
| `npm --prefix src/frontend run lint` | Mỗi phase có đổi code/CSS liên quan | Script ESLint hiện có |
| `npm --prefix src/frontend test` | Client/decoder/validation và regression frontend | Hiện script chỉ chạy `tests/api-client.test.ts`; thêm file test mới phải cập nhật script đúng phạm vi |
| `npm --prefix src/frontend run build` | Routing/provider/hoàn thành phase | Kiểm Next production, không dùng build dev làm bằng chứng |
| `npm run test:ui` | Kiểm browser/integration ở root | Dùng harness; cần PostgreSQL/credential theo README, Chromium và frontend production build mới |
| `npm test` | Mốc tích hợp cuối/ảnh hưởng nhiều tầng | Root chạy backend typecheck/test/test:db/build, frontend typecheck/lint/test/build, rồi UI harness; cần đủ DB/runtime/browser |
| `docker compose --env-file .env.compose up --build -d --wait` | Smoke NFR03 ở FE-07 khi cần | Cấu hình Compose riêng đã chuẩn bị; kiểm cổng/volume thuộc project trước chạy |
| `docker compose --env-file .env.compose --profile checks run --build --rm verify` | Kiểm fullstack container theo README | Docker hoạt động, env riêng hợp lệ; không xóa volume để sửa lỗi |

Không gọi `npm --prefix src/frontend run test:ui` đơn lẻ rồi xem lỗi thiếu fixture là lỗi nghiệp vụ: script này gọi Playwright trực tiếp, cần `L2_UI_BASE_URL` và `L2_UI_FIXTURE` do harness cấp. Không in nội dung fixture vì chứa credential test.

README hiện mô tả hai lệnh startup Compose sau bước chuẩn bị, gồm lệnh `up` và lệnh sao chép password demo riêng. Khi kiểm NFR03 phải làm **đúng README hiện hành**, không bỏ bước rồi tuyên bố đạt hai lệnh. Không tự tạo lại credential local đã có.

## 3. Ma trận truy vết yêu cầu

**SOURCE** cho QT: Case Study — Mục 9, Bảng 9.1 — trang PDF **19**. Diễn giải DD/AUTH thuộc **DESIGN**, không phải quy tắc nguồn mới.

| Yêu cầu | US/UC đã đối chiếu SRS | QT/thiết kế liên quan | Màn hình/API | Giai đoạn | Nhóm kiểm chứng |
| --- | --- | --- | --- | --- | --- |
| Đăng nhập cơ bản | Hạ tầng, không thêm FR/US/UC | AUTH/A01; BT2 Mục 2.3 tr.4 | Login/A01 | FE-01/02 | FE-T01/02 |
| FR01 | US01/UC01 | QT-01/02/14/15 | WF02/E01 | FE-03 | FE-T03/04 |
| FR02 | US02/UC02 | QT-03; DD07, AC thiết bị mới phụ lục | WF02/E03/E04/E05/E08 | FE-03/04 | FE-T05/06/08 |
| FR03 | US03/UC03 | QT-04; không default priority | WF02/E06/E08 | FE-04 | FE-T06/08 |
| FR04 | US04/UC04 | QT-05; DD02/DD05 | WF02/E07/E08, WF03/E10 snapshot | FE-04/05 | FE-T07/08/10 |
| FR05 | US05/UC05 | QT-04/06; DD04/DD06 | WF02/E08 | FE-04 | FE-T07/08 |
| FR06 | US06/UC07 | QT-05/14; NFR02 | WF01/E09; WF03/E10/E11 | FE-05/06 | FE-T09/10/11 |
| FR07 | US07/UC11 | QT-01/02/13/14/15 | WF02/E02 | FE-03 | FE-T04/12 |
| FR08 | US08/UC06 | QT-14; DD08/DD09 | WF03/E12/E13 | FE-05/06 | FE-T10/11/12 |
| NFR01 | SRS Mục 5.1 | <1,5 giây, ≥95/100 lượt, 200 phiếu | WF02/E01 đến DOM | FE-07 | FE-T03; phép đo Mục 6 |
| NFR02 | SRS Mục 5.2 | Chỉ QL đúng scope được duyệt | E11 trực tiếp + WF03 | FE-06/07 | FE-T02/11 |
| NFR03 | SRS Mục 5.3 | Fullstack ≤2 lệnh sau chuẩn bị | Build/Compose/README | FE-07 | Phép dựng lại Mục 6 |

QT-13 được kiểm ở mức giữ lịch sử/không tạo xóa vật lý qua UI; CRUD/soft delete chi tiết đã có backend tests. QT-06: E08 vẫn tạo MOI và log đầu theo backend, E11 không chuyển trạng thái; UI không tự tạo endpoint status log hoặc quản lý vòng đời.

## 4. Mười hai nhóm kịch bản kiểm chứng

Các assertion dưới đây là đầu ra cần kiểm. Một nhóm có thể triển khai bằng nhiều test có tên rõ ràng để cô lập lỗi; không ép thành 12 hàm test lớn.

| Mã | Loại/phạm vi | Dữ liệu và thao tác chính | Kết quả phải kiểm |
| --- | --- | --- | --- |
| FE-T01 | Đúng/sai/biên login | NV/QL đúng, sai username/password, inactive, thiếu field, password có space, biên Unicode theo A01 | Principal thật; route đúng role; lỗi chung401; không trim password; không role selector/token cố định/storage |
| FE-T02 | Phiên/quyền/race | Link client, reload/tab mới, logout, restart backend; QL vào intake, NV vào list; login/request A về muộn sau phiên B | Chuyển route client giữ phiên; reload cần login; NV không E09/QL không catalog; token/dữ liệu phiên cũ không phục hồi hoặc xóa phiên mới; return path không redirect ngoài |
| FE-T03 | Lookup đúng/rỗng/sai | Phone tồn tại/không có/sai; +84/84/space/dot; hai lookup trả khác thứ tự; sửa input lúc tải | Đúng hồ sơ, phone che từ API; không found giả; dấu+ encode; không dùng kết quả số cũ; lookup instrumentation phản ánh DOM kết quả thật |
| FE-T04 | Tạo khách/xung đột | Khách mới; thiếu tên/phone; hai request trùng phone; trùng ngoài scope/ngừng | 201 đúng; 400 field; 409 dùng existing_customer nếu có quyền; không profile ngoài scope; không gửi lại phone masked |
| FE-T05 | Thiết bị/owner/catalog | E03 rỗng, serial exact, nhiều trang; E05 >100 mục trong fixture cách ly; device mới ngày mua/null; cùng serial cùng/khác chủ | Giữ số0/case; không bỏ sót trang; tháng server cấp; chọn existing_device hợp lệ; khác chủ không đổi owner/không lộ hồ sơ; đổi khách bỏ device cũ |
| FE-T06 | Phân loại/biên text | Nhóm rỗng/lỗi, chưa chọn ưu tiên, mô tả whitespace/1/2000/2001 code point, emoji/combining/NUL/surrogate | Không default nhóm/priority; đúng min/max Unicode; lỗi gần field; không POST invalid; giữ dữ liệu khi bị từ chối |
| FE-T07 | Biên bảo hành/SLA | Clock fixture: ngày hết hạn/ngày sau, thiếu mua, hết hạn; thứ Bảy/Chủ nhật; preview rồi ngày server đổi | UI dùng E07/E08 thật, snapshot response cuối; thiếu mua/hết hạn vẫn tạo theo DD; không tính SLA client hoặc đổi can_proceed bằng suy đoán |
| FE-T08 | Tạo phiếu/đồng thời | Luồng đầy đủ; double click/Enter, category/device ngừng giữa preview và POST, timeout sau commit | Chỉ gửi một POST khi busy; actor/status/time không từ input; E08 response có MOI/hạn thật; lỗi giữ draft; timeout không auto tạo thêm; khách/device đã tạo không bị xóa giả |
| FE-T09 | Hàng chờ/filter/page | QL có cả chờ/đã duyệt và ngoài scope; pending rỗng nhưng approved có; cả hai rỗng; page cuối sau duyệt | Dữ liệu/meta đúng scope/filter, cũ trước; không N+1 E10; empty trung thực; filter reset page; quay lại giữ filter; không search/priority query trái contract |
| FE-T10 | Chi tiết/snapshot/history | NV/QL mở ID, ID sai/ngoài scope, cha soft delete, nhiều trang trao đổi; GET detail thành công/E12 lỗi | Phone theo quyền; dùng snapshot; fallback ID không bịa tên; lịch sử cũ trước; chỉ vùng E12 lỗi; không status timeline giả; ID không suy từ ticket_code |
| FE-T11 | Duyệt/ghi theo quyền | QL đúng duyệt, NV/không token/ngoài center gọi E11 trực tiếp; hai QL duyệt; QL gọi E13; ghi trao đổi lúc chờ duyệt | Sai quyền bị từ chối và dữ liệu không đổi; một lần duyệt đầu giữ metadata; MOI/warranty/due/snapshot giữ nguyên; QL không ghi; NV ghi được theo scope; E13 không đổi status |
| FE-T12 | Khả dụng/phục hồi | Tắt backend thật, phục hồi; từng vùng loading/empty/error; POST đã lưu nhưng GET lại lỗi; đổi phiếu có draft; 1920/1280/768/375px và keyboard | Có retry, không white screen; không mất draft sai lúc; saved≠reload failed; không tự lặp POST; focus/label/error/wrap tốt; không credential/raw phone trong minh chứng |

Đối với biên ngày/thời gian và mốc 2026 trong Figma: thiết lập ở fixture/clock server test hiện có, không thêm endpoint chỉnh giờ hoặc dùng ngày cố định trong UI production. Nếu chưa có fixture phục vụ dữ liệu >100, bổ sung fixture cách ly đúng phạm vi test; không sửa catalog/seed thật.

## 5. Tổ chức test và trạng thái giao diện

### 5.1. Client/unit

- Giữ `tests/api-client.test.ts`, mở rộng có mục đích: query E03/E05, `existing_device`, error/DTO, session race, timeout/abort; chỉ thêm test validation biên nơi có logic thật.
- Test transport giả có thể điều khiển thứ tự response và 401 muộn để kiểm không xóa phiên mới. Không báo unit này là bằng chứng gọi backend thật.
- Nếu thêm file `.test.ts`, sửa script frontend `test` để chúng thực sự được chạy; không để file test tồn tại nhưng script không biết.
- Kiểm 204 chỉ cần nếu sau này có client PATCH/DELETE trong phạm vi được giao; không tự đưa CRUD vào frontend để viết thêm test.

### 5.2. Browser với API/PostgreSQL thật

- Tái dùng Playwright/harness hiện có và credential test do harness cấp; không hardcode password/token trong test hoặc screenshot.
- `UI01` hiện đo NFR01; khi gộp reception vào WF02 phải di chuyển instrumentation/selector tương ứng, giữ phép đo đến DOM hiển thị.
- `UI02` hiện kiểm luồng thiếu ngày mua → tạo → trao đổi → quản lý duyệt; cập nhật theo route mới và bảo toàn kiểm MOI/snapshot/SLA/quyền.
- `UI03` hiện kiểm loading/empty/error/retry; dùng trì hoãn **request thật** để quan sát loading, điều khiển backend thật offline/restart, không fake response nghiệp vụ.
- `UI04` hiện kiểm scope/401/token RAM/mobile; giữ và mở rộng sang route guard/response cũ khi thay phiên.
- Nếu đổi vai trò bằng cùng tab, logout/login qua UI; nếu dùng hai browser context thì mỗi context login riêng. Không inject principal để vượt A01.

### 5.3. Checklist thị giác/thao tác

| Màn hình | Phân vùng cần xem | Trạng thái phải chụp/kiểm |
| --- | --- | --- |
| Login | Form, label/password toggle, error, nút busy | Idle, sai credential, mất kết nối, hết phiên |
| WF01 | Header/sidebar, filter hợp API, bảng/meta/page, vùng NV mở ID | Có dữ liệu, pending rỗng, toàn bộ tập CHUA_XAC_MINH rỗng, loading/error/retry |
| WF02 | Khách/thiết bị, form tạo inline, phân loại, summary/CTA | Found/not found, không device, catalog empty, thiếu mua/hết hạn, validation, 201 và kết quả chưa xác định |
| WF03 | Summary/snapshot, trao đổi, approval/cam kết | NV/QL, chưa/đã duyệt, trao đổi rỗng/nhiều trang, partial error, note/content lỗi |

So với Figma, đánh giá thứ bậc, khoảng cách, phân vùng và khả năng đọc. Các field bị lược vì contract phải khớp GAP trong đặc tả, không “sửa” bằng dữ liệu mẫu. Responsive/login là phần đề xuất, không gọi là bản sao của frame đã có.

## 6. Kiểm chứng NFR

### NFR01 — Tra cứu dưới 1,5 giây

- Căn cứ: SRS Mục 5.1, trang ghi trong tài liệu 19; 200 phiếu, 100 lượt tra cứu, tối thiểu95 lượt **<1500ms**; ghi cấu hình máy.
- Dùng fixture cách ly đúng200 ticket; warm-up riêng không cộng vào100; có phone tồn tại và không tồn tại. Phép đo từ submit/click đến kết quả tương ứng được commit/render vào DOM, không chỉ thời gian HTTP.
- Giữ ID/version kết quả để measurement thuộc đúng request; mỗi lượt đợi kết quả đã render trước lượt tiếp.
- Ghi raw100 kết quả, số đạt, p95, max, cấu hình browser/runtime/máy, chế độ production, thời điểm và dataset. Không loại lượt chậm hoặc thay UI error bằng số liệu lookup hợp lệ.
- Đạt khi ≥95/100 lượt đúng kết quả dưới ngưỡng. Ghi giới hạn đây là kiểm local, không suy thành năng lực production/load test.

### NFR02 — Quyền phê duyệt

- Căn cứ: SRS Mục 5.2, trang ghi trong tài liệu19; E11 và QT-14.
- Kiểm trực tiếp API: chưa login/token sai/hết hạn, NV, QL ngoài scope, QL đúng scope. UI ẩn nút chỉ là assertion bổ sung.
- Các request trái quyền trong bộ thử phải bị từ chối; kiểm metadata approval, status, snapshot/due_date và log trước/sau không thay đổi. Có thể tái dùng fixture/backend tests đang chứng minh điều này thay vì thêm luật kiểm quyền vào UI.
- Duyệt đồng thời: một thành công, một409; không ghi đè người/thời điểm đầu và không status log giả. Không suy “bảo mật tuyệt đối” từ số lượng test hữu hạn.

### NFR03 — Tái lập fullstack

- Căn cứ: SRS Mục 5.3, trang ghi trong tài liệu20 và README hiện hành; ≤2 lệnh sau chuẩn bị cấu hình.
- Sau đổi route/provider/build, dùng môi trường Compose riêng đã chuẩn bị theo README; kiểm frontend/backend/database healthy, login thật, một lượt tiếp nhận → tạo → xem detail.
- Thử restart: phiên cũ401, login lại được. Hướng dẫn startup không phát sinh bước thủ công ngoài README; nếu có, sửa tài liệu và kiểm lại.
- Nếu cần clean-room, sao chép filesystem vào thư mục mới được phép, loại secret/dependency/build, dùng env/volume riêng. Không chạy Git theo quy định project và không dọn volume/dữ liệu hiện có để giả môi trường sạch.
- Không cần làm lại toàn bộ packaging trong mỗi phase frontend; chỉ kiểm sâu khi thay đổi/quan ngại thực tế hoặc tại mốc FE-07.

## 7. Lưu minh chứng và bảo toàn kết quả cũ

Trong giai đoạn thực thi, dùng:

```text
docs/progress/frontend/phase-01.md ... phase-07.md
docs/progress/frontend/decision-log.md        # chỉ khi có quyết định cần ghi
docs/tests/frontend/phase-XX/
  verification.md
  screenshots/
  nfr01-local.json                           # ở phase có đo thật
```

- `tests/browser/l2.spec.ts` hiện ghi ra `docs/tests/results/`; trước chạy bộ mới, điều chỉnh thư mục đầu ra cho minh chứng frontend hoặc bảo toàn snapshot cũ theo cách không ghi đè. Không sửa nội dung kết quả Phase 6 cũ để hợp thức UI mới.
- Không ghi credential, token, hash/salt, connection string, config private hoặc ảnh lộ password. Dùng dữ liệu fixture mô phỏng; phone raw đang nhập phải được loại khỏi ảnh chia sẻ khi không cần thiết.
- Mỗi kết quả ghi lệnh, thư mục chạy, ngày giờ, dữ liệu, exit code/số test và lỗi cụ thể. Ảnh chỉ chứng minh trạng thái thị giác, không thay assertion dữ liệu/quyền.
- `PASS`: thực sự chạy đạt; `FAIL`: đã chạy sai; `NOT RUN`: chưa chạy; `BLOCKED`: thiếu điều kiện xác định; `NOT APPLICABLE`: không áp dụng. Không chuyển BLOCKED thành PASS chỉ vì code đọc có vẻ đúng.

## 8. Mẫu báo cáo sau mỗi giai đoạn

Tạo `docs/progress/frontend/phase-XX.md` khi thực sự làm phase. Nội dung tối thiểu:

```markdown
# FE-XX — Tên giai đoạn

Ngày thực hiện: ...
Trạng thái: đang làm / hoàn thành / có blocker

## Phạm vi được giao
Yêu cầu người dùng; phase, màn hình và giới hạn.

## Đã thay đổi
File cụ thể, hành vi trước/sau, lý do và đánh đổi.

## Căn cứ và sai khác
SOURCE/DESIGN/IMPLEMENTATION/PROPOSAL; FR/US/UC/API/QT;
GAP liên quan và quyết định được chấp thuận nếu có.

## Kiểm chứng thực tế
| Lệnh/kịch bản | Kết quả | Bằng chứng/giới hạn |
| --- | --- | --- |
| ... | PASS/FAIL/NOT RUN/BLOCKED/NOT APPLICABLE | ... |

## Còn tồn tại và điểm dừng
Phần chưa kiểm, lỗi baseline/ngoài phạm vi; không tự chuyển phase sau.
```

Không lập sẵn báo cáo với trạng thái hoàn thành, số test hoặc hình minh chứng giả.

## 9. Điều kiện kết thúc kế hoạch

- [ ] Login A01 thật; role/401/logout/token RAM và route guard hoạt động.
- [ ] WF01 dùng đúng tập/quyền/field E09; NV có lối mở ID và không bị dẫn vào list403 mặc định.
- [ ] WF02 gộp tiếp nhận đầy đủ: lookup/tạo khách, thiết bị, phân loại, bảo hành, E08.
- [ ] WF03 snapshot/trao đổi/phê duyệt đúng quyền; state/warranty/SLA không bị đổi trái contract.
- [ ] Tất cả loading/empty/error/retry và kết quả POST chưa xác định có UX rõ ràng.
- [ ] Không mock dữ liệu nghiệp vụ trong UI production; không N+1 E10 để bù summary thiếu field.
- [ ] Kiểm tra frontend/integration phù hợp đã chạy, kết quả và các NFR được ghi đúng phạm vi.
- [ ] Responsive/keyboard/focus/error/overflow được xem thực tế; sai khác Figma có giải thích.
- [ ] README/kiến trúc/sai khác thiết kế cập nhật theo code thật; không sửa nguồn/contract ngoài ủy quyền.
- [ ] Sinh viên nhận được phần giải thích và dự thảo khai báo AI để tự kiểm tra; không tự xác nhận thay sinh viên.

## 10. Nội dung AI disclosure có thể bổ sung sau khi sinh viên yêu cầu

Đây chỉ là dự thảo mô tả hỗ trợ lần lập kế hoạch, không phải chỉnh sửa `docs/ai-disclosure.md`:

- **Công cụ:** OpenAI Codex, Figma Console.
- **Mục đích:** đối chiếu wireframe, API backend, SRS và tài liệu nguồn; lập lộ trình frontend theo giai đoạn.
- **Phạm vi:** ba file `docs/plans/frontend-l2-*.md`.
- **Kiểm chứng của Codex:** đọc code/contract, kiểm kết nối và ảnh Figma, đối chiếu PDF; kiểm cấu trúc/liên kết tài liệu sau khi ghi. Không triển khai UI hoặc chạy test chức năng trong tác vụ lập kế hoạch.
- **Kiểm chứng của sinh viên:** để sinh viên tự ghi sau khi đã đọc, lựa chọn và thực hiện; chưa có căn cứ xác nhận ở thời điểm lập kế hoạch.
