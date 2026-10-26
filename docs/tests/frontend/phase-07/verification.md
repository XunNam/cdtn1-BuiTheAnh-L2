# Minh chứng FE-07

Ngày chạy: **25/10/2026**, múi giờ Asia/Ho_Chi_Minh. Thư mục lệnh: root project, trừ lệnh có `--prefix`. Báo cáo: [FE-07](../../../progress/frontend/phase-07.md). Tất cả ca nghiệp vụ UI dùng Express/PostgreSQL thật trong schema riêng; request trì hoãn dùng response thật, không giả kết quả nghiệp vụ.

## 1. Lệnh và kết quả

| Lệnh/nhóm | Kết quả | Exit | Bằng chứng |
| --- | --- | --- | --- |
| `npm --prefix src/frontend run typecheck` trước chạy hồi quy | PASS |0| Console thực thi; typecheck được lặp trong regression/build/container |
| `npm test` | PASS |0| [regression-run.txt](regression-run.txt):94 unit/HTTP backend,95 PG gồm5 nhóm/90 ca,45 client,53 UI |
| `npm --prefix src/frontend run lint` bản cuối | PASS |0| [lint-final.txt](lint-final.txt), không warning |
| `npm --prefix src/frontend run build` bản cuối | PASS |0| [build-final.txt](build-final.txt),9 route |
| `npm run test:ui` bản cuối | PASS |0| [browser-final-run.txt](browser-final-run.txt),53/53 trong1,9 phút; public fingerprint khớp |
| Compose up/build/wait lần đầu | PASS |0| [compose-build-run.txt](compose-build-run.txt), ba dịch vụ healthy trên volume mới |
| Compose build bản cuối | PASS |0| [compose-final-build-run.txt](compose-final-build-run.txt) |
| API smoke A01/E01–E13, CRUD/history/scope | PASS |0| [compose-smoke-run.txt](compose-smoke-run.txt), helper có sẵn `scripts/compose-smoke.mjs` |
| Restart backend, chờ healthy, kiểm token/snapshot/history | PASS |0| [compose-restart-run.txt](compose-restart-run.txt):401 phiên cũ, login mới, persistence |
| Browser smoke UI production bản cuối | PASS |0| [compose-browser-run.txt](compose-browser-run.txt), [ảnh](compose-ui-detail.png) |
| Compose `--profile checks run --build --rm verify` | PASS |0| [compose-verify-run.txt](compose-verify-run.txt):94/95/45/53; UI1,7 phút, fingerprint đạt |
| Compose down đúng project riêng, giữ volume | PASS |0| [compose-stop-run.txt](compose-stop-run.txt) |
| Kiểm tệp/JSON/UTF-8/link và bảo toàn baseline | Xem audit | | [file-audit.json](file-audit.json), [verification-summary.json](verification-summary.json) |

Sau lượt đầu, chỉ sửa CSS tablet và vị trí form NV dưới lịch sử; đã lint/build và chạy lại đủ53 UI local rồi đủ bộ kiểm thử container. Warning biến không dùng ở test mới trong log đầu đã sửa, lint cuối và container sạch. Warning NO_COLOR/FORCE_COLOR và Node DEP0190 trên Windows có trong log, không phải test thất bại. Không tắt assertion/rule để đạt kết quả.

## 2. Môi trường, dữ liệu và bảo toàn

- Local: Windows11 `10.0.26300`, Node24.18.0, PostgreSQL18.6, Chromium156.0.8078.4, Next16.4.2/React19.3.0 từ dependency hiện có. Máy i9-14900HX,32 logical CPU, RAM≈34GB; metadata đầy đủ trong JSON NFR01.
- UI harness dùng schema `phase2_test_ui_<random>`, credential/cổng tạm và fixture200 ticket, catalog104 active; không seed public. Fingerprint7 bảng public trước/sau khớp ở cả local và container; schema/control files riêng được harness dọn. Các PG tests còn kiểm sequence/transaction theo phạm vi từng case.
- Docker Engine29.9.2, Compose5.6.1; phiên bản Node/PostgreSQL container thực tế ở [compose-runtime.txt](compose-runtime.txt). Dockerfile/Compose/lockfile không đổi.
- Project `mekong-fe07-20261025`; frontend3317/backend3318 chỉ bind127.0.0.1; database không publish. Hai volume mới `mekong-fe07-20261025_pgdata` và `mekong-fe07-20261025_credentials`; không dùng development credential/database để chạy stack.
- Cấu hình/password/receipt/token test chỉ trong `src/backend/.private/fe07-compose/` bị ignore; không chép vào evidence. Sau kiểm thử, project đã down, giữ volume. Không chạy Git hoặc xóa volume/database của sinh viên.
- Ảnh là dữ liệu seed/fixture mô phỏng. Input raw phone trong ảnh stress mới được mask khi chụp; UI và API thực không thay đổi. Ảnh QL của regression có phone mô phỏng để thể hiện đúng quyền hiển thị; không dùng dữ liệu cá nhân thật.

## 3. Figma và QA thị giác

Figma Console: live probe thành công qua Desktop Bridge15ms, đúng file **Mekong Mobile - L2 - 3 Wireframe tĩnh**, key `IYbByIdGl6ksmlp1Yvxld7`. Search component ở phiên này trả0 hợp lệ. Đọc file depth1/summary, tải page, tìm lại ID/name/kích thước; chụp và xem ba frame1920×1080 scale0,75. [Metadata đọc thật](figma-review.json). Không chỉnh sửa file Figma hoặc cần token REST mới.

| Màn hình | Đối chiếu desktop và kết quả | Sai khác giữ có căn cứ |
| --- | --- | --- |
| WF01 `14:6` | Header/sidebar đơn sắc, heading/filter/bảng/phân trang. Bảng8 cột có caption, gợi ý/region cuộn ngang, focus rõ | GAP-01–05: hàng chờ QL, hai filter, sort cũ trước, summary thật/ID; NV mở bằng ID. Không dựng search/tên/ưu tiên khi E09 thiếu |
| WF02 `14:158` | Khách/thiết bị trái, phân loại giữa, kiểm tra/tạo phải tại1920/1280; hai cột768, một cột375. Ô nhập/nút xếp dọc ở tablet/mobile để đọc được; lỗi sát field | GAP-06: chưa tạo thì chưa có hạn chính thức. Preview và kết quả lấy server; nội dung dài cuộn trang, không cố định1080px |
| WF03 `14:268` | Hai cột thông tin/lịch sử và snapshot/phê duyệt trên desktop; một cột tablet/mobile. Form NV ở dưới lịch sử; ba loại trạng thái rõ | GAP-04/05/07/08: dùng ID thật, không timeline giả, lịch sử cũ trước theo E12, snapshot/due giữ nguyên |
| Login | Cùng palette/type/field/button; empty/error/focus/loading và password toggle; bốn viewport không tràn | GAP-10: Figma không có login; thiết kế bổ sung, không gọi là bản sao frame |

Đánh giá thứ bậc/khả dụng, **không đo pixel parity**. CSS có Inter fallback Arial khi máy không có Inter; không tải font ngoài. Responsive là phương án dự án theo kế hoạch. Ảnh dữ liệu dài cố ý thể hiện trường hợp120 ký tự tên/255 địa chỉ/50 serial và mô tả/trao đổi dài, nên chiều cao lớn hơn frame tĩnh.

| Kiểm trực quan/thao tác | Minh chứng |
| --- | --- |
| Login1920/1280/768/375, label, lỗi có mô tả, Enter, skip link và route focus | FE07-UI01; [1920](final-login-1920.png), [375](final-login-375.png); FE02-UI01–06 |
| Intake ba/hai/một cột, input>140px, long name/serial, focus field sai | FE07-UI02; [1920](final-intake-1920.png), [1280](final-intake-1280.png), [768](final-intake-768.png), [375](final-intake-375.png), [lỗi](final-intake-errors-375.png) |
| Text dài, xuống dòng, HTML chỉ là text, không overflow toàn trang | FE07-UI03; [desktop](final-long-detail-1920.png), [mobile](final-long-detail-375.png) |
| Bảng cuộn nội bộ qua ArrowRight và focus outline | FE07-UI04; [ảnh375](final-queue-keyboard-375.png) |
| Queue và detail ở bốn viewport | FE05-UI08; `queue-{1920,1280,768,375}.png`, `detail-{1920,1280,768,375}.png` |

Đã xem trực quan ba ảnh Figma và các ảnh đại diện login, intake desktop/tablet/mobile, bảng focus, detail desktop và Compose; các kích thước còn lại có assertion kích thước/overflow và ảnh được tạo bởi test. **NOT RUN** screen reader/audit WCAG toàn diện, Firefox/Safari và thiết bị thật.

## 4. Loading/empty/error/retry và bảo vệ ghi

| Vùng | Ca PASS và ảnh |
| --- | --- |
| Login | FE02-UI03–06: sai credential,400 field, network/backend offline, capacity và retry; [busy](login-loading.png), [offline](login-offline.png), [validation](login-validation-mobile.png) |
| Khách/thiết bị/catalog | UI03/FE03: found/notfound, device rỗng, catalog rỗng/lỗi/GET phục hồi; [loading](state-loading-reception.png), [empty](state-empty-reception.png), [catalog](intake-empty-catalog.png) |
| Phân loại/bảo hành/E08 | FE04: preview/category tải và retry độc lập, empty, lỗi, biên,201, timeout sau commit không gửi lại; [loading](state-loading-intake.png), [validation](classification-validation-375.png), [uncertain](ticket-uncertain.png) |
| Queue | UI03/FE05: loading, filter rỗng/toàn bộ rỗng, offline và retry; [loading](state-loading-approval.png), [empty](state-empty-approval.png), [filter](queue-filter-empty.png), [offline](backend-offline.png) |
| Detail/history/E11/E13 | FE05/FE06: E12 lỗi độc lập,401/403/404,201/200 đã lưu nhưng GET lỗi,409, timeout thực10s, response muộn; [saved+GET error](communication-saved-reload-error.png), [uncertain](communication-uncertain.png), [409](approval-conflict.png), [recovered](approval-recovered.png) |

Backend thực được pause/resume/restart qua harness; không thay lỗi đó bằng response nghiệp vụ tự dựng. 49 regression trước được giữ, bốn ca FE-07 bổ sung khả dụng có ý nghĩa.

## 5. Mười hai nhóm kiểm chứng và NFR

| Nhóm kế hoạch | Ca đại diện đã PASS |
| --- | --- |
| FE-T01 login | FE02-UI01–06; F-U19–22 |
| FE-T02 phiên/quyền/race | FE01-UI01–02, UI04, FE06-UI10/12; F-U13–18 |
| FE-T03 lookup | FE03-UI01/05; UI01/NFR01 |
| FE-T04 tạo khách/xung đột | FE03-UI01/02/07/08 |
| FE-T05 thiết bị/owner/catalog | FE03-UI03/04/06/07 |
| FE-T06 phân loại/biên | FE04-UI01/04/05; FE07-UI02 |
| FE-T07 bảo hành/SLA | FE04-UI02/03; backend P4-I04/07/11/18/21 |
| FE-T08 tạo phiếu/đồng thời | FE04-UI06–09; backend TC08/P4-I12/13 |
| FE-T09 queue/filter/page | FE05-UI01/05/06/08; FE07-UI04 |
| FE-T10 detail/snapshot/history | FE05-UI02/03/04/07; FE07-UI03 |
| FE-T11 duyệt/ghi/quyền | FE06-UI01–12; P5-I12/TC10/11 |
| FE-T12 khả dụng/phục hồi | UI03; FE02-UI05, FE03-UI07, FE04-UI07, FE06-UI03/04/08/09; FE07-UI01–04 |

**NFR01 — PASS:** [100 mẫu local](nfr01-local.json), ghi lúc `2026-10-25T09:43:31.474Z`;200 ticket được xác nhận trước thử, một warm-up không tính,50 lookup tồn tại/50 không có. Đo từ handler click đến committed DOM +2 animation frames, đúng kết quả mỗi lượt.100/100 dưới1500ms (ngưỡng≥95), p50≈46,9ms, p95≈48,3ms, max≈48,9ms. Lượt container riêng cũng100/100, p95≈47,7ms, max≈48,2ms theo stdout; không dùng thay bộ100 mẫu local. Đây là đo local, không khẳng định năng lực tải production.

**NFR02 — PASS:** [9 ca API trực tiếp](nfr02-local.json), trích nguyên kết quả P5-I12 từ regression. Anonymous/token sai/hết hạn/khóa tài khoản401, NV/giả role403, QL ngoài center404; hash7 bảng trước/sau từng request bằng nhau. Backend TC11 và FE06-UI06 kiểm hai QL: một200/một409, giữ metadata đầu; các ca thành công giữ MOI/warranty/due/snapshot/log. Không suy bảo mật tuyệt đối từ số ca hữu hạn.

**NFR03 — PASS trong phạm vi tái lập local:** chuẩn bị test.env với credential mới/cổng riêng trước, không tính là startup. Đã chạy hai lệnh tương đương README, chỉ thêm project/env/path riêng để tránh dữ liệu có sẵn:

```powershell
docker compose --project-name mekong-fe07-20261025 --env-file src/backend/.private/fe07-compose/test.env up --build -d --wait
docker compose --project-name mekong-fe07-20261025 --env-file src/backend/.private/fe07-compose/test.env cp backend:/app/.private/demo-passwords.local.json src/backend/.private/fe07-compose/demo-passwords.local.json
```

Ba dịch vụ healthy trên volume mới; dùng credential xuất riêng đăng nhập UI, tiếp nhận→tạo→detail và logout. API smoke/restart giữ dữ liệu, token cũ401/login mới được. Lệnh kiểm thử độc lập theo README cũng đã PASS:

```powershell
docker compose --project-name mekong-fe07-20261025 --env-file src/backend/.private/fe07-compose/test.env --profile checks run --build --rm verify
```

[Trạng thái ba healthy](compose-status.json) ghi trước khi down. Image cài từ lockfile, context loại `.env`/`.private`/dependency/build; có layer cache được dùng, không tuyên bố tải lại mọi package từ Internet hoặc lặp phép filesystem-copy clean-room của backend Phase6. Bản frontend cuối đã rebuild và smoke UI lại; verify container chạy đủ cùng bộ94/95/45/53.

## 6. Bảo toàn và giới hạn báo cáo

Audit dùng SHA-256 trước FE-07 và sau hoàn tất cho các tệp thuộc phạm vi scan: source/docs/scripts và cấu hình root, loại dependency/build/cache/private/Git. So sánh backend toàn bộ, contract/SRS/schema, lockfile, minh chứng và báo cáo các phase trước, AI disclosure và instructions. Danh sách thay đổi/nhóm bảo toàn trong [file-audit.json](file-audit.json); không coi đây là quét bảo mật toàn máy hoặc bằng chứng các file bị loại khỏi scan.

GAP-01–10 vẫn được ghi đúng [đặc tả](../../../plans/frontend-l2-screen-spec.md). Không đổi API/backend production/schema/migration/config/seed/dependency hay tài liệu nguồn; không chạy Git. Không xác nhận sinh viên tự review AI, tự chạy test, commit/tag/push/nộp BT2 hoặc toàn bộ rubric BT3. [Dự thảo AI riêng](../../../progress/frontend/ai-disclosure-draft.md) để sinh viên xem trước.
