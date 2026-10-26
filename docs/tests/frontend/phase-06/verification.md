# FE-06 — Minh chứng phê duyệt và ghi trao đổi

Ngày: **2026-10-25**. **IMPLEMENTATION**. [Báo cáo FE-06](../../../progress/frontend/phase-06.md).

## Kết quả thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| Baseline frontend typecheck/test | PASS39/39 trước sửa |
| Frontend typecheck/lint/build | PASS bản cuối, không warning,9 route |
| Frontend unit/client | PASS45/45,0 fail/skip;6 nhóm mới F-U40–45 |
| Backend typecheck | PASS helper fixture mở rộng |
| Browser production/API/PostgreSQL thật | PASS49/49 trong1,8 phút;12 FE-06 +37 regression |
| Fingerprint public | PASS `UI_FIXTURE_PUBLIC_PRESERVED` |
| Full root npm test/backend suite | NOT RUN trong FE-06 |
| Docker/clean-room/NFR03 | NOT RUN trong FE-06 |

[Log UI đầy đủ](browser-run.txt) ghép nguyên các đoạn output thực tế theo thứ tự. Không dùng mock response nghiệp vụ để báo đã tích hợp. Typecheck/lint trong phát triển đã phát hiện lỗi nhánh ReactNode và ref cleanup; đã sửa trước build/lint/browser cuối. Không disable rule/ép any để bỏ lỗi.

## Tái lập

Với dependency, PostgreSQL và Chromium theo README, từ root:

```powershell
npm --prefix src/frontend run typecheck
npm --prefix src/frontend run lint
npm --prefix src/frontend test
npm --prefix src/backend run typecheck
npm --prefix src/frontend run build
npm run test:ui
```

Harness tạo schema/cổng/credential tạm riêng, so fingerprint7 bảng public trước/sau và chỉ dọn tài nguyên của lượt chạy. Fixture trạng thái không còn được duyệt nhận ID qua file control, chỉ cập nhật ticket và status log cùng transaction trong schema test. Không thêm HTTP endpoint hay module phân công, không thay schema/seed/config thật.

## Kịch bản mới

| Mã | Kết quả đã kiểm |
| --- | --- |
| UI01 | Trao đổi thiếu/whitespace/2001 code point không POST;2000 emoji lưu, payload content, busy1 POST, actor/time/ID response và bản ghi21 ở trang3 |
| UI02 |400 Express thật do request thiếu content; giữ draft/focus, gửi lại chủ động thành công |
| UI03 |201 rồi GET E12 lỗi: vẫn xác nhận saved, không POST lại; retry GET và draft mới rỗng |
| UI04 | E13 commit rồi timeout10s; GET đối chiếu không tự suy từ content/POST lặp; bản nhập khác chỉ sau xác nhận người dùng |
| UI05 | Note1000/1001, trim,1 POST, metadata thật; MOI/CHUA_XAC_MINH/received/due/snapshot không đổi; hàng chờ cập nhật khi về |
| UI06 | QL21 duyệt trước, QL22 stale POST409: giữ approved_by/at/note đầu và bỏ action |
| UI07 | Ticket fixture sang trạng thái không áp dụng:409 thật, đọc lại và bỏ action |
| UI08 | E11 commit rồi timeout10s, blank note→null; phục hồi bằng GET E10, không POST lại |
| UI09 |200 rồi E10 lỗi: giữ xác nhận đã duyệt, retry chỉ GET |
| UI10 | NFR02 trực tiếp API, sai quyền/no token/ngoài scope bị từ chối, dữ liệu trước/sau nguyên |
| UI11 | E13 trả muộn sau đổi ID không đưa saved/draft vào phiếu mới; bản ghi thực thuộc ID cũ |
| UI12 | E13 bị403 giữ draft và phiên; restart→401 thật khi POST, về login/dọn dữ liệu |

Các case có prefix FE06 trong `src/frontend/tests/browser/tickets-write.spec.ts`. Unit F-U40–45 kiểm Unicode/biên/note tùy chọn, điều kiện duyệt, response metadata, lỗi field/unknown và request chỉ note/content. Unit dùng transport kiểm soát;49 browser mới là tích hợp API/PostgreSQL thật.

## NFR02 — Trực tiếp server và dữ liệu trước/sau

| Request thật | Response đã xác minh | Dữ liệu |
| --- | --- | --- |
| E11 chưa có token |401 | Approval trước/sau không đổi |
| E11 từ NV đúng trung tâm |403 | Approval trước/sau không đổi |
| E11 từ QL ngoài trung tâm phiếu |404 | Phiếu ngoài scope vẫn chờ duyệt, không cập nhật |
| E13 từ QL |403 | Danh sách trao đổi trước/sau không đổi |
| E11 QL đúng quyền |200 | Metadata từ server, MOI/warranty/SLA/snapshot giữ nguyên |
| QL thứ hai tới sau |409 ALREADY_APPROVED | Metadata/note đầu không bị ghi đè |

Đây là kết quả của các trường hợp đã chạy, không suy thành kiểm định bảo mật toàn diện. Không lấy việc ẩn nút frontend làm bằng chứng quyền server.

## Ảnh thật

| Ảnh | Nội dung |
| --- | --- |
| [Saved/GET lỗi](communication-saved-reload-error.png) | Receipt xác nhận ID/actor/time đã lưu, lịch sử lỗi có retry riêng |
| [E13 chưa xác định](communication-uncertain.png) | Giữ bản nhập, chỉ GET đối chiếu, không auto POST |
| [Xung đột duyệt](approval-conflict.png) | QL22 thấy metadata của QL21 sau409, không ghi đè |
| [Phục hồi duyệt](approval-recovered.png) | E10 xác nhận đã duyệt sau timeout, đúng actor/time/null note |
| [Desktop](detail-1280.png), [mobile](detail-375.png) | Form note/count/action trong bố cục FE-05 |

Đã xem saved/GET lỗi,409, phục hồi và mobile; regression kiểm không tràn ngang1920/1280/768/375. Không coi đây là kiểm định accessibility toàn diện hoặc hoàn thiện thị giác toàn FE-07.

## NFR01 và phạm vi bảo toàn

[Raw NFR01](nfr01-local.json), lúc `2026-10-25T08:47:25.443Z`:200 phiếu,1 warm-up,100 mẫu click→DOM cộng2 animation frame;100/100 dưới1500ms, p95≈48,4ms, max≈49,2ms. Đây là regression local, không thay nghiệm thu FE-07/đóng gói.

[File audit](file-audit.json) so SHA-256 với344 tệp trước FE-06, phân biệt helper UI thay đổi và backend production giữ nguyên; kiểm contract/SRS/schema/dependency/API client/DTO/auth/intake và evidence/báo cáo cũ. Snapshot có giới hạn, không phải audit bảo mật toàn repo. FE-07 chưa bắt đầu; giới hạn idempotency/draft RAM và kiểm chứng chưa chạy tại [báo cáo](../../../progress/frontend/phase-06.md).
