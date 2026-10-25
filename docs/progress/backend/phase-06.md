# Phase 6 — Integration Testing, Packaging & Reproducibility

**Ngày:** 2026-10-25. **Kết quả:** HOÀN THÀNH phạm vi kỹ thuật Phase 6.  
**Workspace hiện tại:** D:\Đồ án\CĐTN1\cdtn1-BuiTheAnh-L2, có quyền workspace-write trong phiên này. Không dùng kết luận quyền từ phiên cũ, không sử dụng Git.

## A. Phạm vi và kết quả cuối

Giữ login, E01–E13 và bốn thao tác CRUD bổ sung; hoàn thiện ba màn hình Next tối thiểu, API client, kiểm thử tích hợp/contract/UI, 12 case minh chứng, NFR01–03, Docker Compose và phép thử dựng lại từ bản sao sạch. README, kiến trúc thực tế, nhật ký thiết kế và dự thảo AI đã cập nhật. Không thêm module nghiệp vụ, endpoint nghiệp vụ, bảng hoặc migration.

Nghiệm thu kỹ thuật Phase 6 không đồng nghĩa đã nộp BT2. C6 về commit/lockfile/tracking, tag v0.2, quyền truy cập repo của giảng viên và xác nhận cá nhân trong khai báo AI vẫn cần sinh viên xác nhận.

## B. Audit đầu vào

| Hạng mục trước sửa | Kết quả |
| --- | --- |
| Backend | Có login/E01–E13, PATCH/DELETE Customer/Device và kiến trúc phân lớp, PostgreSQL thật |
| Regression baseline | Type-check/build/db:check PASS; 90 unit/HTTP, 78 PG subtest PASS, 0 FAIL/SKIP; runner PG tính cả 4 parent là 82 |
| Frontend | Có Next/React/TypeScript nhưng trang chính rỗng; trang customer thử dùng wrapper sai contract; chưa ba màn hình API thật hoặc auth |
| UI/client | Chưa có client thống nhất, minh chứng loading/empty/error/retry và luồng trình duyệt |
| Packaging/docs | Chưa Dockerfile/Compose, README root chưa đủ dựng fullstack |
| NFR | Có bộ 9 request NFR02; chưa đo đúng NFR01 hoặc chạy NFR03 fullstack |

Đã đọc AGENTS, kế hoạch sáu phase, báo cáo 01–05, decision log, schema, API gốc/phụ lục, SRS, nhật ký thiết kế, Backend/Frontend source và test, wireframe/kiến trúc hiện hành. Khoảng thiếu Frontend so với BT2 mục 2.3 đã được sinh viên cho phép xử lý trong Phase 6.

**SOURCE trực tiếp:** Case Study — stakeholder/phỏng vấn tr.6, quy trình tr.10–12 (L2 tr.12), dictionary tr.15–16, Bảng 9.1 tr.19; BT2 mục 2.1–2.2 tr.3, 2.3–2.4 tr.4, 2.5–2.6 tr.5, hình thức nộp tr.6, checklist 4.2 tr.8 và kiểm chứng tr.9; Buổi 8 workshop tr.5–7, Buổi 9 giao tiếp tr.10–13, tự học Buổi 9 tr.2/5. Nguồn/PDF được giữ read-only. DD và TECH là DESIGN, kết quả chạy là IMPLEMENTATION.

## C. Frontend và tích hợp

| Màn hình | Actor/API thật | Trạng thái đã kiểm |
| --- | --- | --- |
| Khách hàng & thiết bị | NV; E01–E05 | Tra cứu đang tải, không tìm thấy khách, thiết bị rỗng, lỗi/retry và ngăn gửi trùng |
| Phân loại & tạo phiếu | NV; E06–E08/E10/E12/E13 | Đang tải, chưa chọn thiết bị/lịch sử rỗng, validation, lỗi/retry, kết quả mã phiếu/hạn/snapshot |
| Hàng chờ & phê duyệt | QL; E09–E12 | Đang tải, rỗng theo bộ lọc, lỗi/retry, phân trang, phản hồi đã duyệt/không thuộc diện; không cấp E13 cho QL |

Giữ Next 16.4.2, React 19.3.0 và TypeScript 5. Wireframe BT1 p1 dự kiến danh sách/search/mới trước cho NV, khác API E09 hiện hành: chỉ QL, CHUA_XAC_MINH và cũ trước. Theo phạm vi sinh viên đã giao, tách phần nhập p2 thành hai bước và ghép hàng chờ với detail/approval p3; ghi TD-13, không sửa PDF/contract/SRS.

Client riêng xử lý base/env, Bearer RAM, JSON/error envelope, field lỗi, 401/403/404/409, timeout/network/5xx và runtime DTO. Component không fetch trực tiếp, không dùng dữ liệu nghiệp vụ giả. Proxy cùng origin chỉ forward allowlist, không SQL hoặc luật nghiệp vụ. Principal/role do server cấp; Backend luôn kiểm quyền/center. 401 sau restart thật xóa phiên/về login; không lưu token vào localStorage/sessionStorage.

## D. Kiến trúc thực tế

[Kiến trúc đã hiện thực](../../architecture-thuc-te.md): Frontend → API client → Next proxy → Express routes/validation/auth → services/domain → repositories → PostgreSQL. DEP-A cung cấp products/centers/accounts; credential scrypt ở private, Bearer session ở RAM.

Rà source xác nhận không SQL trong routes; chữ DELETE trong thông báo validation không phải truy vấn SQL. Service/domain không dùng Express req/res/status; repository dùng tham số SQL. Transaction giữ cùng PoolClient. CSDL có sáu bảng nghiệp vụ và schema_migration kỹ thuật, không thêm bảng account/product/session hoặc mảng làm kho dữ liệu chính. Không refactor ngoài lỗi tích hợp và đóng gói.

## E. Kiểm thử

Môi trường local Node 24.18.0/npm 12.1.0/PostgreSQL 18.6 UTF8; container Node 24.22.1/PostgreSQL 18.6. Fixture/schema/credential test tự tạo, không phụ thuộc dữ liệu cá nhân.

| Lệnh/nhóm thực tế | Expected | Actual cuối |
| --- | --- | --- |
| npm test từ root | Một lệnh, fail-fast, đủ các nhóm | PASS: 94 unit/HTTP, 90 PG subtest, 12 client, 4 browser; 0 FAIL/SKIP |
| Backend test:db trong lệnh trên | CRUD/transaction/lock/seed/contract và regression | 95 runner PASS = 90 subtest + 5 parent; không tính parent thành case nghiệp vụ |
| Backend/Frontend type-check và build; Frontend lint | Không lỗi | PASS local và image verify |
| npm run test:ui sau bổ sung ảnh state | Bốn UI case, public giữ nguyên | 4/4 PASS; UI_FIXTURE_PUBLIC_PRESERVED |
| Compose profile checks run --build --rm verify từ bản sao sạch | Cùng bộ kiểm thử trong container | PASS 94/90/12/4, 0 FAIL/SKIP |
| compose-smoke.mjs trên 3130 và 3140 | Login/E01–E13/CRUD/history | PASS; sau restart token cũ 401, login mới đọc đúng dữ liệu |
| Playwright --grep UI02 trên hai stack | Một lượt ba màn hình thật | 1/1 PASS mỗi stack; không khai các case không được chọn là PASS từ lệnh lọc |
| npm run backend; npm run frontend | Local dev khởi động | Backend 401 khi thiếu token; Frontend 200 có login; đã dừng tiến trình test |
| Lệnh cài Chromium trong README | Chuẩn bị được trình duyệt | PASS |
| npm audit Backend sau vá | Không advisory được báo | 0 vulnerabilities tại lần kiểm; không bảo đảm tương lai |

[12 case TC01–TC12](../../tests/bt2-test-evidence.md) có trace/input/precondition/expected/actual, đủ luồng đúng, biên và dữ liệu sai; 12 PASS. Bằng chứng: [log local](../../tests/results/final-local-test.txt), [UI cuối](../../tests/results/final-ui-evidence.txt), [clean-room](../../tests/results/clean-room-test.txt), [summary](../../tests/results/verification-summary.json).

Lỗi gặp và đã sửa: accessible name của select gồm cả option → aria-label; pending route bị xử lý hai lần → times:1; Next route announcer trùng role alert → named alert; helper TC12 tìm riêng trang 1 → duyệt pagination đúng contract. Không thay expected của old test hoặc đổi contract để che lỗi.

Vá dependency gián tiếp body-parser 2.3→2.4.0 theo [advisory chính thức](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828); không nâng Express/direct stack. Decoder 400 trả envelope an toàn. Test gzip hỏng rồi login hợp lệ chứng minh process vẫn hoạt động. Compose phiên bản này không hỗ trợ restart --wait; đã dùng restart rồi up -d --wait, clean-room dùng down/up giữ volume.

## F. NFR

| Mã | Kết quả đo đúng đặc tả | Đánh giá |
| --- | --- | --- |
| NFR01 | Đúng 200 ticket; 100 lookup (50 tồn tại/50 không); warm-up riêng; 100/100 dưới 1500ms, p95 48ms, max 48.5ms | PASS trên cấu hình đo; click handler→DOM commit+2RAF, không chỉ HTTP latency |
| NFR02 | 9/9 request trái quyền bị từ chối 401/403/404; hash 7 bảng trước/sau từng lượt khớp | PASS bộ hữu hạn; không tuyên bố bảo mật tuyệt đối |
| NFR03 | Sau chuẩn bị config, hai lệnh Docker lên Frontend/API/DB và xuất credential demo; clean-room/UI thật | PASS, không cần cài Node/PostgreSQL riêng để startup |

Máy: i9-14900HX, 32 logical CPU, RAM 33,959,649,280 byte, Windows 10.0.26300, Chromium 156.0.8078.4. [NFR chi tiết](../../tests/nfr-evidence.md), [100 mẫu](../../tests/results/nfr01-local.json), [9 request](../../tests/results/nfr02-phase6.json). Browser warm, local, tuần tự; chưa kiểm tải đa người dùng/máy yếu. Container clean-room cũng đạt 100/100, p95 khoảng 47.9ms; không trộn mẫu với số local.

## G. Docker và khả năng chạy lại

Dockerfile multistage build/backend/frontend/verify. Runtime Backend/Frontend chạy user node, không copy .env/private/dependency host. Compose có ba dịch vụ, hai volume riêng; database chỉ mạng nội bộ, publish HTTP loopback. Database healthy trước Backend; initializer preflight→advisory lock→credential nếu chưa có→migrate checksum→seed→server. Credential tồn tại được validate/reuse. Startup lỗi không chạy API.

Stack đầu l2p6_2f208f87 ở ports 3130/3131: build/up --wait thành công, ba healthy, API/UI PASS. Restart rồi migrate trả [], hai lần seed tạo 0 ticket; hash toàn bộ hàng 7 bảng, sequence và credential khớp. Dữ liệu đã PATCH, soft delete, duyệt và trao đổi trong smoke vẫn giữ nguyên. Negative initializer với CREDENTIAL_FILE=/dev/null trả CONFIGURATION_ERROR/nonzero, không publish API.

Image đã thử: node:24-bookworm-slim digest sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205; postgres:18-alpine digest sha256:898c60cb390d1085bc97bdd6a1ae968757421df394b071848b52b1c09c89d6a5. Tags có thể thay đổi về sau; đây là môi trường đã kiểm, không bảo đảm tái lập bit-for-bit mọi thời điểm.

## H. README và clean-room test

README root có chuẩn bị/env, local/Docker, credential mới hoặc có sẵn, migration/seed, test một lệnh, trình diễn, chạy lại và giới hạn. Backend/Frontend README khớp.

Bản sao .private/clean-room-l2p6_20261025 được tạo bằng filesystem, 133 file, bỏ .git/.env thật/.private/node_modules/dist/.next/source PDF/output. Cấu hình và credential mới, project/volume mới; không Git hoặc làm sạch repo gốc.

Hai lệnh startup sau chuẩn bị config, đúng README với tham số test project:

1. docker compose --env-file .env.compose -p l2p6clean_20261025 up --build -d --wait
2. docker compose --env-file .env.compose -p l2p6clean_20261025 cp backend:/app/.private/demo-passwords.local.json demo-passwords.local.json

Sau đó chạy test tổng hợp bằng một lệnh profile checks verify, API smoke và UI02 thật: PASS. Down không -v → up lại, migration [], hai lần seed tạo 0; hash/sequence/credential giữ nguyên; token trước restart 401. Sau smoke có 32 customer, 32 device, 6 category, 202 ticket, 202 log, 33 communication trong volume test. Verify image tự có Node/Chromium, không mượn dependency/credential private từ host. Thay đổi test sau clean-room chỉ thêm chụp ảnh state, đã chạy lại 4/4 UI local.

## I. Bảo vệ database và secret

[Public audit](../../tests/results/public-preservation.json): trước/sau giữ 30/30/6/200/200/30/2; SHA256 từng bảng khớp; ticket_code_seq=1000000/is_called=false. Phương pháp chỉ đọc: sort các to_jsonb(row)::text, nối LF rồi SHA256. Existing .env, Frontend .env.local, credential private, migration 001/002, contract/SRS/PDF/source và old test được so baseline, không thay đổi. Không sửa password hoặc quyền PostgreSQL.

[Secret scan](../../tests/results/secret-scan.json): đối chiếu 30 giá trị secret thực đã biết trong source/artifacts, log hai stack, image config/history và toàn bộ lớp image: 43 thành viên archive, 843,247,954 byte, giải nén 24 lớp; 0 hit. Volume credential private không phải image/source phân phối. .gitignore bảo vệ .env/.private/demo-passwords.local.json và artifact tạm; .dockerignore chặn secret khỏi build context. Phép quét không chứng minh không có secret chưa biết, cũng không xác nhận Git đã track gì.

Đã dọn đúng container/network và bốn volume test của hai project sau khi xác minh tên/label ownership. Không down -v/prune hoặc đụng volume người dùng; [receipt cleanup](../../tests/results/cleanup.json). Bản sao sạch/log/credential test giữ trong vùng .private cục bộ để kiểm tra, không phân phối.

## J. File tạo/sửa/xóa

Danh sách từ SHA256/filesystem baseline, không Git; [file-audit.json](../../tests/results/file-audit.json). next-env.d.ts do Next tự cập nhật. Backend lock chỉ vá body-parser gián tiếp; Frontend thêm Playwright 1.64.1 dev dependency. Hai wrapper API thử sai contract bị bỏ.

**Sửa (22 tệp):**

- `.env.example`
- `.gitignore`
- `README.md`
- `docs/ai-disclosure.md`
- `docs/thay-doi-thiet-ke.md`
- `docs/progress/backend/decision-log.md`
- `src/backend/.env.example`
- `src/backend/package-lock.json`
- `src/backend/package.json`
- `src/backend/README.md`
- `src/backend/src/errors.ts`
- `src/backend/src/runtime-config.ts`
- `src/frontend/next.config.ts`
- `src/frontend/package-lock.json`
- `src/frontend/package.json`
- `src/frontend/README.md`
- `src/frontend/tsconfig.json`
- `src/frontend/app/globals.css`
- `src/frontend/app/layout.tsx`
- `src/frontend/app/(mekong-mobile)/page.tsx`
- `src/frontend/app/(test-page)/customers/page.tsx`
- `src/frontend/app/(test-page)/customers/new/page.tsx`

**Tạo (45 tệp):**

- `.dockerignore`
- `compose.yaml`
- `Dockerfile`
- `package.json`
- `docs/architecture-thuc-te.md`
- `docs/progress/backend/phase-06.md`
- `docs/tests/bt2-test-evidence.md`
- `docs/tests/nfr-evidence.md`
- `docs/tests/results/backend-offline.png`
- `docs/tests/results/clean-room-test.txt`
- `docs/tests/results/cleanup.json`
- `docs/tests/results/file-audit.json`
- `docs/tests/results/final-local-test.txt`
- `docs/tests/results/final-ui-evidence.txt`
- `docs/tests/results/nfr01-local.json`
- `docs/tests/results/nfr02-phase6.json`
- `docs/tests/results/public-preservation.json`
- `docs/tests/results/screen-1-reception.png`
- `docs/tests/results/screen-2-ticket.png`
- `docs/tests/results/screen-3-approval.png`
- `docs/tests/results/secret-scan.json`
- `docs/tests/results/state-empty-approval.png`
- `docs/tests/results/state-empty-history.png`
- `docs/tests/results/state-empty-reception.png`
- `docs/tests/results/state-loading-approval.png`
- `docs/tests/results/state-loading-intake.png`
- `docs/tests/results/state-loading-reception.png`
- `docs/tests/results/verification-summary.json`
- `scripts/compose-fingerprint.mjs`
- `scripts/compose-smoke.mjs`
- `scripts/test-all.mjs`
- `src/backend/scripts/ui-test.ts`
- `src/backend/src/compose-start.ts`
- `src/backend/src/healthcheck.ts`
- `src/backend/tests/frontend-contract.postgres.test.ts`
- `src/backend/tests/packaging.http.test.ts`
- `src/backend/tests/packaging.unit.test.ts`
- `src/frontend/.env.example`
- `src/frontend/playwright.config.ts`
- `src/frontend/app/api/[...path]/route.ts`
- `src/frontend/src/components/l2-app.tsx`
- `src/frontend/src/lib/api-client.ts`
- `src/frontend/src/lib/contracts.ts`
- `src/frontend/tests/api-client.test.ts`
- `src/frontend/tests/browser/l2.spec.ts`

**Xóa (2 tệp):**

- `src/frontend/src/lib/api/customer.client.tsx`
- `src/frontend/src/lib/api/getCustomers.tsx`


## K. Truy vết

| SOURCE / DESIGN | API / UI | Test / minh chứng |
| --- | --- | --- |
| QT-01/02/15; FR01/07, US01/07, UC01/11 | E01–02; UI1 | TC02/03, UI01/02, client DTO |
| QT-03; FR02/US02/UC02 | E03–05; UI1 | TC04, CRUD regression/Compose |
| QT-04/05/06; FR02–05, US02–05, UC02–05; DD02/05/06 | E06–08/domain/SLA; UI2 | TC05–09, intake biên/transaction, UI02 |
| QT-05/14; FR06/US06/UC07; NFR02 | E09–11/row lock/principal; UI3 | TC10/11/12, P5-I12, UI04 |
| QT-13/15; FR08/US08/UC06 | E10/E12/E13/history; UI2/3 | TC12, soft-delete regression, Compose persistence |
| AUTH/CRUD phụ lục và BT2 | Login/scrypt/session, Customer/Device CRUD | Unit/HTTP/PG, Compose smoke, UI401 |
| BT2 2.2–2.4; NFR01/03 | Client, UI, Compose, test-all | 12 client + 12 PG TC + 4 UI, raw NFR/clean-room |

Mapping UC dùng API và nhật ký hiện hành: FR06→UC07, FR07→UC11, FR08→UC06. Không tự thực hiện mọi QT-01–15 hoặc biến quyết định kỹ thuật thành SOURCE.

## L. Đối chiếu BT2

SOURCE: BT2 mục 4.2 tr.8.

| Mục | Yêu cầu | Kết quả |
| --- | --- | --- |
| C1 | Chạy từ trạng thái đầu theo README | PASS kỹ thuật: clean-room config/volume mới |
| C2 | Ba lớp tách đúng chiều | PASS routes/services/repositories, source và runtime |
| C3 | Ít nhất hai quy tắc thật | PASS normalize/mask/warranty/SLA/approval |
| C4 | Ba test thuộc ba loại, một lệnh PASS | PASS TC đúng/biên/sai; npm test/verify |
| C5 | Chạy lại không lỗi/nhân đôi | PASS seed 0/hash/restart |
| C6 | Lockfile đã commit, env example đủ, env thật không trong repo | **Cần sinh viên xác nhận** commit/tracking; kiểm tĩnh file/ignore đủ, không dùng Git để khai trạng thái |
| C7 | Input sai: rõ lỗi, không sập/lộ lỗi thư viện | PASS validation/error DTO/gzip400 rồi login200 |
| S1 | Ít nhất hai thực thể đầy đủ CRUD | PASS Customer và Device, soft delete theo phụ lục |
| S2 | Service không HTTP | PASS không Express req/res/status |
| S3 | Migration CSDL trống và seed | PASS schema/Compose mới, hai version checksum |
| S4 | Ba màn hình API thật, ba trạng thái | PASS UI02/03/04 và ảnh thật |

Năm thành phần BT2 mục 2.1–2.5 tr.3–5:

1. Module cốt lõi: PASS kỹ thuật, hai CRUD/ba lớp/luật/migration/seed.
2. Bộ kiểm thử: PASS ba loại và một lệnh, fixture tự dựng.
3. Module mở rộng/trình bày: PASS ba màn hình/client/login/states.
4. Hệ thống tích hợp: PASS kỹ thuật README/clean-room và Docker hai lệnh; commit lockfile thuộc C6 chờ sinh viên. Docker là mức nâng cao, không tự coi là minimum BT2.
5. Tài liệu/phụ lục: có README/architecture/change log/env example/minh chứng; AI disclosure là dự thảo đúng bốn cột, **TODO sinh viên tự kiểm chứng**.

PDF nộp bài, trang bìa/link/tag v0.2, quyền repo giảng viên và nộp đúng hạn: NOT RUN, ngoài hành động được giao. Không tự chấm điểm hoặc gọi BT2 đã hoàn thành/nộp.

## M. Rủi ro và giới hạn

Prototype local, session RAM một process; refresh/restart cần login. Chưa có refresh token, quản trị account, cloud hoặc cơ chế production. NFR01 chỉ cấu hình/tập mẫu đo, NFR02 chỉ bộ hữu hạn. First build cần mạng để tải image/npm/Chromium; image tag có thể dịch chuyển về sau. Không có UI CRUD đầy đủ hoặc danh sách NV ngoài contract. BT1/PDF giữ nguyên, sinh viên cần đọc TD-13/14 khi bảo vệ.

Warnings quan sát: NO_COLOR/FORCE_COLOR của runner; Node DEP0190 trên Windows khi spawn npm.cmd với args script cố định, không secret/user input. Không có FAIL/SKIP; không mở rộng hệ thống để xử lý warning không liên quan.

## N. Khai báo AI

Đã bổ sung [dự thảo bốn cột](../../ai-disclosure.md) cho Phase 1–6, giữ lịch sử BT1. Ghi đúng Codex đã chạy kiểm thử nào và TODO sinh viên đọc/hiểu/tự chạy. Không xác nhận thay sinh viên hoặc tạo cam kết cá nhân mới.

## O. Checklist nghiệm thu 30 mục

| # | Điều kiện | Kết quả / bằng chứng |
| --- | --- | --- |
| 1 | Login/E01–E13 giữ đúng | PASS regression/TC/Compose |
| 2 | Bốn CRUD giữ nguyên | PASS old test/Compose smoke |
| 3 | Sáu bảng nghiệp vụ | PASS audit/migrations |
| 4 | Toàn bộ regression | PASS 94/90/12/4, 0 FAIL/SKIP |
| 5 | Ba nhóm test, một lệnh | PASS npm test/verify |
| 6 | 10–12 case có truy vết | PASS 12 TC |
| 7 | Ba màn hình API thật | PASS UI02/Compose hai stack |
| 8 | Client riêng | PASS source/client tests |
| 9 | Login UI | PASS UI/Auth |
| 10 | Loading/empty/error/retry | PASS UI03 và ảnh |
| 11 | Tiếp nhận→duyệt/trao đổi | PASS UI02/TC12 |
| 12 | Authorization/center scope | PASS P5-I12/TC10/UI04 |
| 13 | Bảo hành/SLA/snapshot/transaction | PASS regression/TC05–12 |
| 14 | NFR01 đo đúng | PASS 100 mẫu/200 ticket |
| 15 | Kiểm lại NFR02 | PASS 9/9 và hash |
| 16 | NFR03 theo SRS | PASS clean-room fullstack hai lệnh |
| 17 | README dựng sạch | PASS clean-room |
| 18 | Migration/seed lặp | PASS []/0+0/hash |
| 19 | Docker chạy thật | PASS ba healthy |
| 20 | Không quá hai lệnh startup | PASS up + credential cp sau chuẩn bị |
| 21 | Public development giữ nguyên | PASS counts/hash/sequence |
| 22 | Bảo vệ secret/credential | PASS phạm vi scan đã ghi; credential cũ khớp |
| 23 | Kiến trúc thực tế | PASS tài liệu/source/runtime |
| 24 | Nhật ký thiết kế | PASS TD-13/14 |
| 25 | Dự thảo AI trung thực | PASS có TODO sinh viên |
| 26 | Bảng C1–C7/S1–S4 | PASS có bảng đúng nguồn; C6 chờ sinh viên |
| 27 | Type-check/build hai phần | PASS local/container |
| 28 | Báo cáo Phase 6 | PASS A–P và artifact |
| 29 | Không ngoài L2 | PASS không bảng/API/nghiệp vụ mới |
| 30 | Không sử dụng Git | PASS quy trình không gọi Git/đụng .git |

## P. Kết luận

**HOÀN THÀNH Phase 6 trong phạm vi kỹ thuật được giao**, có bằng chứng runtime và bảo toàn dữ liệu. Chưa xác nhận C6/Git/tag/push/nộp BT2 hoặc việc sinh viên tự kiểm chứng AI. Dừng tại Phase 6, chờ sinh viên nghiệm thu.
