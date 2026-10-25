# Minh chứng Frontend FE-01

Ngày: **25/10/2026**. Kết quả quan sát từ lệnh thực tế; đây là bảng tổng hợp, không phải log stdout được tạo giả.

| Lệnh tại root | Kết quả cuối |
| --- | --- |
| `npm --prefix src/frontend run typecheck` | PASS |
| `npm --prefix src/frontend run lint` | PASS |
| `npm --prefix src/frontend test` | PASS —18/18 |
| `npm --prefix src/frontend run build` | PASS —9 route gồm4 trang UI mới, proxy, entry, not-found và2 alias |
| `npm run test:ui` | PASS —6/6,18,3 giây, API/PostgreSQL thật |

Harness so public trước/sau trả `UI_FIXTURE_PUBLIC_PRESERVED`; ghi dữ liệu vào schema test riêng và chỉ dọn schema đó. Các lỗi môi trường và hai lỗi test ở lượt trước đã được ghi đầy đủ trong [báo cáo FE-01](../../../progress/frontend/phase-01.md).

Client tests gồm12 regression cũ và6 test mới: A01/401, 401 muộn từ phiên cũ, response dữ liệu cũ, login sau logout, đổi phiên lúc decode body và return path/ID an toàn.

Browser tests giữ4 regression (lookup performance, tạo/trao đổi/duyệt, loading/empty/offline/retry, quyền/restart/mobile), thêm2 kịch bản route/session/anonymous guard và URL detail/logout/Back. Không fake response nghiệp vụ.

## Artifacts

- [Đối chiếu file](file-audit.json): SHA-256 xác nhận61 file backend,4 contract/schema,5 package/lockfile,20 minh chứng cũ và2 AGENTS không đổi.
- [Raw NFR01](nfr01-local.json):100/100 dưới1500ms, fixture200 phiếu, warm-up riêng, p95≈48,2ms, max≈49,9ms; có thông số máy/Node/PostgreSQL/browser. Chỉ phản ánh local production build trong lượt đo.
- [Shell desktop](fe01-shell-desktop.png), [tablet768px](fe01-shell-768.png), [mobile375px](fe01-shell-375.png): đã xem ảnh, không tràn ngang ở hai viewport nhỏ theo assertion.
- [Tiếp nhận](screen-1-reception.png), [chi tiết/trao đổi](screen-2-ticket.png), [quản lý đã duyệt](screen-3-approval.png): UI/API thật, dữ liệu mô phỏng cách ly; chưa phải giao diện cuối của phase sau.
- [Loading lookup](state-loading-reception.png), [lookup rỗng](state-empty-reception.png), [loading phân loại](state-loading-intake.png), [lịch sử rỗng](state-empty-history.png), [loading danh sách](state-loading-approval.png), [hàng chờ rỗng](state-empty-approval.png), [backend offline](backend-offline.png).

Chưa chạy lại Compose/clean-room hoặc toàn suite backend trong FE-01. Giữ nguyên evidence Phase 6 ở `docs/tests/results/`; đường dẫn output mới có thể đặt bằng `L2_UI_OUTPUT_DIR` trong test environment.
