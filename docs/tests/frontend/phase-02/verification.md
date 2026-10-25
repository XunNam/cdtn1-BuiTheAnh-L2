# Minh chứng Frontend FE-02

Ngày: **25/10/2026**. Tổng hợp từ các lệnh đã chạy; không phải log stdout giả lập. Chi tiết phạm vi: [báo cáo FE-02](../../../progress/frontend/phase-02.md).

| Lệnh tại root | Kết quả cuối |
| --- | --- |
| `npm --prefix src/frontend run typecheck` | PASS |
| `npm --prefix src/frontend run lint` | PASS |
| `npm --prefix src/frontend test` | PASS —22/22,0 fail/skip |
| `npm --prefix src/frontend run build` | PASS —9 route, API không đổi |
| `npm run test:ui` | PASS —12/12,30,2 giây;6 regression +6 FE-02 |

UI dùng Next production, Express/PostgreSQL thật và fixture cách ly. Lỗi400 là response Express thật khi test gửi thiếu field; lỗi mạng do browser offline;503 do tắt backend hoặc lấp đầy100 session thật. Không fake response. Harness trả `UI_FIXTURE_PUBLIC_PRESERVED`, dọn đúng schema test và không sửa public.

## Ảnh login

- [Desktop1280](login-1280.png), [tablet768](login-768.png), [mobile375](login-375.png): đã xem desktop/mobile; test không tràn ngang ở cả3 viewport.
- [Lỗi field ở mobile](login-validation-mobile.png): đã xem, error gần ô và focus hiện rõ.
- [Đang đăng nhập](login-loading.png): input/toggle/submit bị khóa, một request.
- [Sai credential](login-invalid-credentials.png): lỗi chung, không tiết lộ account và không báo hết phiên giả.
- [Mất kết nối](login-offline.png), [đầy session](login-capacity.png): thông báo riêng và nút Thử lại.

Password trong ảnh test được che; không lưu token/password/fixture private vào báo cáo. Form sử dụng POST và request JSON, không đưa credential vào query URL.

## Regression và bảo toàn

- [Raw NFR01](nfr01-local.json):100/100 lượt dưới1500ms,200 phiếu, warm-up riêng, p95≈47,7ms/max48,5ms; có cấu hình máy/runtime/browser.
- Các ảnh receipt/detail/approval/loading/empty/offline còn lại trong thư mục này là regression của lượt FE-02; không thay ảnh FE-01 hoặc Phase 6 cũ.
- [Đối chiếu file](file-audit.json): SHA-256 so với snapshot đầu phase, xác nhận các nhóm backend/contract/dependency/auth nền tảng và evidence cũ không đổi.

Chưa chạy lại toàn suite backend hoặc Docker/clean-room trong FE-02. Không dùng các kết quả local này để kết luận hoàn thành FE-03–07/BT3.
