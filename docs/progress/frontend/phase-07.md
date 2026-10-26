# FE-07 — Hoàn thiện thị giác, hồi quy và bàn giao

Ngày: **25/10/2026**. Trạng thái: **HOÀN THÀNH phạm vi FE-07; lộ trình frontend FE-01–07 hoàn thành**. Không còn blocker kỹ thuật được phát hiện trong bộ kiểm tra đã chạy. Dừng sau giai đoạn cuối được giao.

## 1. Điều kiện bắt đầu và căn cứ

Đã kiểm tra [báo cáo FE-06](phase-06.md): 45/45 client và49/49 UI đạt, không có blocker mở. Những giới hạn API đã ghi nhận không yêu cầu đổi contract để thực hiện FE-07. Làm theo [lộ trình](../../plans/frontend-l2-implementation-plan.md), [đặc tả](../../plans/frontend-l2-screen-spec.md) và [kế hoạch kiểm chứng](../../plans/frontend-l2-verification-plan.md).

- **SOURCE:** căn cứ nghiệp vụ giữ theo baseline Case Study — Mục9/Bảng9.1 — trang PDF19, QT-01–06/13–15 liên quan L2. FE-07 không thay luật nghiệp vụ và không gán mã quy tắc mới.
- **DESIGN:** SRS FR01–08, NFR01–03; API A01/E01–E13; các DD và GAP-01–10 đã chốt trong kế hoạch. Figma Console live probe thành công, tìm lại ba frame `14:6`, `14:158`, `14:268` trong file `IYbByIdGl6ksmlp1Yvxld7`, page `14:2`; đã xem ảnh cả ba. Không sửa Figma.
- **IMPLEMENTATION:** kết quả bên dưới dựa trên kiểm thử thật và ảnh UI production; không suy từ ảnh rằng đã đạt quyền, transaction hoặc toàn bộ BT3.

## 2. Đã thực hiện

| Thành phần | Thay đổi và lý do |
| --- | --- |
| `src/frontend/src/components/intake/classification-form.tsx` | Tách vùng03 phân loại và04 kiểm tra/tạo phiếu, giữ một form/fieldset và toàn bộ state/validation/khóa gửi hiện có; warranty và summary ở vùng kiểm tra |
| `src/frontend/app/globals.css` | WF02 ba cột từ1280px, hai cột ở768–1279px, một cột dưới768px; thu gọn definition list ở cột hẹp; textarea/select invalid có border lỗi; focus bảng rõ |
| `src/frontend/src/components/tickets/ticket-table.tsx` | Gợi ý cuộn ngang, liên kết aria-describedby; bảng cuộn bằng bàn phím trong vùng riêng |
| `src/frontend/src/components/tickets/ticket-detail.tsx` | NV nhập trao đổi ngay dưới lịch sử ở cột trái theo WF03; QL duyệt ở cột phải, controller và quyền giữ nguyên |
| `src/frontend/tests/browser/polish.spec.ts` | Bốn ca mới kiểm login/keyboard, bố cục ba-hai-một cột, input không bị bó hẹp, text dài/HTML dưới dạng văn bản, cuộn và focus bảng |
| Sáu browser spec hiện có | Chỉ chuyển output mặc định sang phase-07; giữ49 ca và assertion nghiệp vụ cũ |
| `scripts/frontend-compose-smoke.mjs` | Smoke UI production với API/DB Compose thật: login → khách → thiết bị → tạo → detail → logout; lỗi chỉ ghi tên bước để không lộ password qua call log |
| Hồ sơ | README hai cấp, kiến trúc, TD-21, trạng thái kế hoạch, báo cáo/evidence mới và dự thảo AI riêng |

Khi xem ảnh lượt đầu, ô tra cứu/serial tại768px quá hẹp vì nút nằm cùng hàng. Đã đổi nhóm input/nút thành chiều dọc dưới1280px và kiểm lại input rộng hơn140px ở bốn viewport. Bản cuối lint sạch, build đạt và chạy lại đủ53 UI trên Windows/Docker. Đây là sửa khả dụng, không đổi API/quy tắc.

## 3. Quyết định kỹ thuật và đối chiếu wireframe

Giữ CSS/global tokens và component hiện có, không thêm thư viện hoặc font tải ngoài. Header64px/sidebar184px, nền trắng/xám, hierarchy và các vùng chính bám wireframe; responsive và login là thiết kế bổ sung đã dự kiến. Nội dung thật cần nhiều chiều cao hơn frame tĩnh, được cuộn theo trang; không ép dữ liệu dài vào canvas1080px.

WF01 tiếp tục là hàng chờ CHUA_XAC_MINH cho QL, NV mở bằng ID; không dựng tìm mã/phone, ưu tiên, tên tham chiếu hoặc danh sách đầy đủ khi E09 không hỗ trợ. WF02 dùng kết quả bảo hành và hạn từ server; chưa tạo thì chưa có hạn cam kết chính thức. WF03 tách ba trạng thái, snapshot, lịch sử cũ trước và phần ghi theo vai trò; không dựng timeline chuyển trạng thái khi chưa có API. Xem ma trận thị giác và các GAP trong [minh chứng](../../tests/frontend/phase-07/verification.md).

Frontend không trực tiếp truy cập DB, không thêm fetch ngoài API client, không tính lại warranty/SLA hoặc cấp quyền duyệt ở client. Một form và khóa ref/fieldset tiếp tục bảo vệ E08; E11/E13 giữ xử lý đã lưu/GET lỗi và kết quả chưa xác định của FE-06.

## 4. Truy vết yêu cầu → kiểm chứng thực tế

Các tên test dưới đây nằm trong `src/frontend/tests/browser/`, chạy qua harness API/PostgreSQL thật. Mapping US/UC theo SRS/ma trận kế hoạch, không phải mã mới.

| Yêu cầu | US/UC; API | Kiểm chứng đã PASS |
| --- | --- | --- |
| Đăng nhập/phiên | AUTH; A01 | FE02-UI01–06, FE01-UI01–02, UI04; FE07-UI01 |
| FR01 tra cứu khách | US01/UC01; E01 | FE03-UI01/05; UI01 đo click→DOM; client phone/race |
| FR02 thiết bị | US02/UC02; E03–E05/E08 | FE03-UI03/04/06/07; FE04-UI05, backend owner/UNIQUE |
| FR03 phân loại | US03/UC03; E06/E08 | FE04-UI01/04/05; FE07-UI02, Unicode/không default |
| FR04 bảo hành | US04/UC04; E07/E08/E10 | FE04-UI02/03; FE05-UI03, snapshot không tính lại |
| FR05 SLA/tạo phiếu | US05/UC05; E08 | FE04-UI02/03/06/07; backend transaction/log/biên lịch |
| FR06 duyệt | US06/UC07; E09–E11 | FE05-UI01/05/06; FE06-UI05–10, metadata đầu/SLA giữ |
| FR07 tạo khách | US07/UC11; E02 | FE03-UI01/02/07/08, xung đột/scope/không tự POST lại |
| FR08 trao đổi | US08/UC06; E12/E13 | FE05-UI02/07; FE06-UI01–04/10–12, actor/time/quyền |
| NFR01 | SRS5.1, 200 phiếu/100 mẫu |100/100 dưới1500ms, p95≈48,3ms, max≈48,9ms trên local |
| NFR02 | SRS5.2; QT-14/E11 | P5-I12:9/9 request trái quyền bị từ chối, hash7 bảng mỗi lượt giữ nguyên; FE06-UI10 bổ sung |
| NFR03 | SRS5.3; fullstack≤2 lệnh sau chuẩn bị | Compose mới: up/build/wait + cp credential, ba healthy, UI thật/API/restart/persistence; một lệnh verify đạt |

Mười hai nhóm FE-T01–12 đều có ca thực thi trong ma trận [verification.md](../../tests/frontend/phase-07/verification.md). Giới hạn contract được giữ rõ; PASS trong phạm vi này không xác nhận những tính năng chưa có API.

## 5. Kiểm chứng

| Lệnh/kiểm tra | Kết quả thật |
| --- | --- |
| `npm test` từ root | PASS, exit0: backend94/94 unit/HTTP; PostgreSQL95/95 theo Node gồm5 nhóm cha và90 ca; frontend45/45; build/typecheck/lint chạy; UI53/53 |
| `npm --prefix src/frontend run lint` và `run build` bản cuối | PASS, exit0; lint không warning, production build9 route |
| `npm run test:ui` bản bố cục cuối | PASS, exit0,53/53 trong1,9 phút; `UI_FIXTURE_PUBLIC_PRESERVED` |
| Compose up/build/wait + cp | PASS, exit0; project/port/volume/credential FE-07 mới riêng |
| API Compose E01–E13 và restart | PASS, exit0; phiên cũ401, login lại, snapshot/approval/communication còn nguyên |
| Smoke UI Compose bản cuối | PASS, exit0; login → tiếp nhận → tạo → detail → logout |
| Compose profile checks `run --build --rm verify` | PASS, exit0:94/95/45 và53 UI trong1,7 phút; typecheck/lint/build và fingerprint đạt |
| Audit tệp/UTF-8/link | Xem [file-audit.json](../../tests/frontend/phase-07/file-audit.json) và [verification.md](../../tests/frontend/phase-07/verification.md) |

Lượt `npm test` đầu có một lint warning biến fixture không dùng trong test mới; đã bỏ biến và lint lại sạch. Warning NO_COLOR/FORCE_COLOR và Windows DEP0190 của runner cũ có trong log; không có test FAIL/SKIP. Không sửa dependency/runner chỉ để dọn warning ngoài phạm vi.

Chi tiết lệnh, log, môi trường, dữ liệu,100 mẫu NFR01,9 ca NFR02 và ảnh ở [minh chứng FE-07](../../tests/frontend/phase-07/verification.md). Ảnh/fixture dùng dữ liệu mô phỏng; input phone ở ảnh stress mới được che khi chụp, không thay response/DOM nghiệp vụ.

## 6. Bàn giao và giới hạn còn lại

- Bốn màn hình đã chạy API thật. Chạy lại theo [README root](../../../README.md) hoặc [README frontend](../../../src/frontend/README.md); `npm test` là lệnh hồi quy local đầy đủ, `npm run test:ui` sau build là UI riêng. Không chạy Playwright trần khi thiếu fixture.
- Stack kiểm thử `mekong-fe07-20261025` đã dừng; giữ hai volume và cấu hình/credential riêng trong `.private/fe07-compose/` bị ignore. Không xóa volume/dữ liệu development, không sửa `.env`/credential có sẵn. Public development được kiểm fingerprint qua harness.
- Giữ GAP-01–10: E09 QL/CHUA_XAC_MINH, thiếu search/tên tham chiếu/timeline/SLA preview; không cần đổi API cho lộ trình đã thực hiện. Muốn mở rộng phải có quyết định riêng và cập nhật contract trước.
- Reload/tab mới cần login; chưa revoke/refresh/persistent session. E08 chưa rõ kết quả trước ID chưa có cách tự tìm lại chắc chắn; không tự gửi lại. Đây là giới hạn prototype đã biết.
- QA Chromium desktop/mobile mô phỏng1920/1280/768/375px; **NOT RUN** Firefox/Safari/thiết bị thật, screen reader và audit WCAG đầy đủ. NFR01 là phép đo local hữu hạn, không load test production. Docker dùng build context được lọc và volume mới; không lặp lại phép filesystem-copy clean-room riêng của backend Phase6.
- Đã tạo [dự thảo khai báo AI](ai-disclosure-draft.md); không sửa `docs/ai-disclosure.md` hoặc xác nhận thay sinh viên. Nghiệm thu cá nhân, Git/tag/push/nộp bài và đối chiếu toàn bộ rubric BT3 chưa được thực hiện trong FE-07.

Không có công việc lập trình frontend còn lại trong bảy phase đã giao. Các giới hạn trên được bàn giao minh bạch, không tự mở phase/module mới.
