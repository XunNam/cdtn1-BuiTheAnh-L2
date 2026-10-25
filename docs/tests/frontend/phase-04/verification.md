# FE-04 — Minh chứng phân loại, bảo hành và tạo phiếu

Ngày: **2026-10-25**. **IMPLEMENTATION**; [báo cáo FE-04](../../../progress/frontend/phase-04.md). Không thay tiêu chí nghiệm thu BT3.

## Kết quả cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Baseline frontend typecheck/test | PASS29/29 trước sửa |
| Frontend typecheck/lint/build production | PASS;9 route, không thêm endpoint |
| Frontend unit/client | PASS35/35,0 fail/skip; F-U30–35 là6 nhóm mới |
| Backend typecheck | PASS, gồm helper fixture mở rộng |
| Browser trên bản production cuối | PASS29/29,1,1 phút;9 FE-04 +20 regression |
| Fingerprint public | PASS `UI_FIXTURE_PUBLIC_PRESERVED` |
| Backend suite đầy đủ/root npm test | NOT RUN trong FE-04 |
| Docker/clean-room/NFR03 | NOT RUN trong FE-04 |

[Log UI](browser-run.txt) gồm output thực tế của lượt sau chỉnh timestamp và trích đoạn xác nhận cuối sau sửa thông báo timeout; hai lượt được ghi riêng, không tự tạo kết quả. Lượt UI đầu25/29 do3 locator trùng nhãn và1 so sánh timestamp bỏ qua mili giây; đã sửa rồi29/29. Lượt cuối tiếp tục29/29, có assertion không gợi ý gửi lại POST chưa xác định. Typecheck ban đầu cũng phát hiện kiểu DOM trong test click lặp; sửa bằng type guard HTMLButtonElement, không ép kiểu để bỏ lỗi.

## Cách tái lập

Từ root với dependency/PostgreSQL/Chromium đã chuẩn bị theo README:

```powershell
npm --prefix src/frontend run typecheck
npm --prefix src/frontend run lint
npm --prefix src/frontend test
npm --prefix src/backend run typecheck
npm --prefix src/frontend run build
npm run test:ui
```

Không chạy Playwright trần khi thiếu fixture. Helper tạo schema/cổng/credential tạm riêng, so fingerprint7 bảng public trước/sau, chỉ dọn schema do lượt chạy tạo. Clock test chỉ đi qua dependency now đã có ở device/warranty/ticket service; auth dùng giờ thật. Điều khiển clock và nhóm active qua file tạm của harness, không thêm endpoint hoặc sửa config/seed/migration thật.

## Kịch bản và bằng chứng

| Kịch bản | Kết quả kiểm qua API thật |
| --- | --- |
| Dữ liệu bắt buộc/Unicode | Không default nhóm/ưu tiên; whitespace/2001 code point bị chặn;2000 emoji lưu201; lỗi400 thật giữ draft/focus |
| Bảo hành | Còn/hết/thiếu ngày mua, đúng ngày hết hạn/ngày sau; receipt Mới/approval/can_proceed đúng E08 |
| Clock/SLA |28/09/2026 09:00 CAO →29/09 09:00;30/09 TRUNG_BINH →03/10;01/10 THAP →07/10;03/10 23:00 CAO →05/10 23:00;04/10 Chủ nhật CAO →06/10 00:00, tất cả theo +07:00 |
| Preview khác lúc tạo | Preview30/09 còn hạn; server đổi01/10, E08 hết hạn; receipt nhận snapshot chính thức mới |
| Nhóm/thiết bị ngừng | Thay dữ liệu fixture sau preview; E08 từ chối thật, giữ draft, không success giả/đổi chủ |
| Gửi lặp/Back |2 click cùng lượt chỉ1 POST; khóa lựa chọn khi ghi; receipt mở detail/Back không tự gửi lại |
| Timeout sau commit | API thật lưu, response giữ quá10 giây; UI khóa draft chưa xác định, không retry POST; E10 đọc được phiếu đã lưu |
| Hủy và phiên | Hủy dismiss/accept qua bàn phím, dữ liệu customer/device đã lưu còn nguyên; response cũ sau logout không đưa receipt vào phiên mới |

Assertions nằm trong `src/frontend/tests/browser/ticket-intake.spec.ts`; log cuối ghi tên từng case. Unit F-U30–35 kiểm biên Unicode, membership/enum, payload6 field, E07 không ngày máy, kết quả ghi chưa xác định và format timestamp Việt Nam. Các20 regression cũ giữ luồng tạo/trao đổi/duyệt, scope, phiên, login, khách/thiết bị và NFR01; không bỏ assertion để làm test xanh.

## Ảnh browser thật

| Ảnh | Nội dung |
| --- | --- |
| [1920px](classification-1920.png), [1280px](classification-1280.png) | Preview server, nhập/phân loại và summary chưa tự có hạn |
| [768px](classification-768.png), [375px](classification-375.png) | Bố cục một cột, label/field/action/summary không tràn ngang |
| [Validation375](classification-validation-375.png) | Field bắt buộc và focus/aria sau submit sai |
| [Nhóm rỗng](classification-empty.png) | E06 trả rỗng thật từ fixture, chưa cho tạo |
| [Hết hạn](ticket-expired.png) | E08 vẫn201, không cần phê duyệt theo DD02 |
| [Chờ duyệt](ticket-pending.png) | Thiếu ngày mua: Mới/Chưa xác minh/Chờ duyệt và hạn server |
| [Timeout](ticket-uncertain.png) | Kết quả ghi chưa xác định, không có retry POST |
| [Chi tiết](screen-2-ticket.png), [duyệt](screen-3-approval.png) | Regression các bước sau tạo qua link mở chi tiết |

Đã xem desktop/mobile, receipt và trạng thái lỗi/timeout; browser kiểm không tràn ngang ở4 viewport. Không coi đây là đánh giá accessibility toàn diện hoặc hoàn thiện thị giác toàn FE-07.

## NFR01 và bảo toàn

[Raw NFR01](nfr01-local.json): đo lúc `2026-10-25T08:00:24.593Z`,200 phiếu,1 warm-up và100 mẫu click→DOM cộng2 animation frame;100/100 dưới1500ms, p95≈48,2ms, max≈49,1ms. Đây là regression local, không suy thành hạ tầng khác hoặc toàn FE-07.

[File audit](file-audit.json) so SHA-256 với snapshot trước FE-04; tách helper backend test khỏi backend production, xác nhận client/DTO/auth/dependency/contract/SRS/schema và evidence trước được giữ. Audit chỉ bao phủ tập tệp đã snapshot, không phải quét bảo mật toàn repo. FE-05 chưa bắt đầu; giới hạn idempotency/draft cục bộ và kiểm chứng chưa chạy ghi tại [báo cáo](../../../progress/frontend/phase-04.md).
