# 12 test case minh chứng BT2 — Phase 6

**IMPLEMENTATION**, chạy thật 2026-10-25: TC01–TC12 **12 PASS, 0 FAIL, 0 SKIP**. File: src/backend/tests/frontend-contract.postgres.test.ts. Đây là tập trình bày vừa đủ, không thay thế toàn bộ regression. Client Frontend được import trực tiếp, gọi HTTP Express thật và PostgreSQL thật trong schema ngẫu nhiên tự migrate/seed. Clock fixture 2026-09-28 09:00 +07; không đọc credential local để tạo identity test.

Chạy cả bộ: `npm test` tại root; hoặc đúng một lệnh Docker verify trong README. Chạy riêng Backend PG: `npm --prefix src/backend run test:db`. Mỗi test xuất P6_BT2_EVIDENCE, lỗi assert làm lệnh thất bại. Tiền điều kiện chung: Node/pg account có CREATE schema trong database được chỉ định hoặc Compose riêng; không cần dữ liệu public có sẵn.

| ID / loại | Truy vết | Input và tiền điều kiện | Expected | Actual / kết quả |
| --- | --- | --- | --- | --- |
| TC01 đúng | AUTH phụ lục, QT-14, NFR02 | nv_demo_a, password ngẫu nhiên test | 200 Bearer, principal NV11/center1 | Đúng role/center/token length; PASS |
| TC02 đúng | FR01/07, US01/07, UC01/11, QT-01/02/15; E01/E02 | 0885550001, +84 885.550.001, 84885550001, 0885 550 001 | Cùng customer_id; NV thấy phone che, address null | 4 dạng cùng hồ sơ, 088****001; PASS |
| TC03 sai | FR07/US07/UC11, QT-01; E02 | Tạo lại phone TC02 theo dạng84 | 409 PHONE_ALREADY_EXISTS; existing_customer che; count không đổi | 409 và count giữ nguyên; PASS |
| TC04 đúng/sai | FR02/US02/UC02, QT-03; E03–E06 | product101, serial P6-EVIDENCE-001, purchase null; tạo cùng serial cho khách khác | 201 months12; 409 OWNER_MISMATCH, chủ không chuyển; catalog/list đúng DTO | DB owner giữ nguyên; PASS |
| TC05 biên | FR04/US04/UC04, QT-05/DD05; E07 | mua2025-09-28,12tháng, đánh giá2026-09-28 | Còn BH đúng ngày cuối | CON_BAO_HANH, expiry2026-09-28; PASS |
| TC06 biên | FR04/US04/UC04, QT-05/DD02; E07 | Cùng thiết bị, đánh giá2026-09-29 | Hết BH, preview200, không yêu cầu approval | HET_BAO_HANH/requires_approval=false; PASS |
| TC07 ngoại lệ đúng | FR02–05, US02–05, UC02–05, QT-04/05/06; E07/E08 | thiếu ngày mua, mô tả, category3, priorityCAO | CHUA/CHO, MOI, purchase/expiry null, chưa cho tiếp tục | DTO+DB đúng; PASS |
| TC08 nguyên tử | FR05/US05/UC05, QT-06; E08 | Phiếu TC07 và lỗi CHECK vào initial log trong schema test | Một log NULL→MOI; lỗi log rollback ticket, trả500 an toàn | Actor11/log1, count ticket không tăng khi lỗi; PASS |
| TC09 sai | FR03/05, US03/05, UC03/05; E08 | Thiếu priority | 400 fields.priority, không tạo phiếu | ApiError400 có trường, count giữ nguyên; PASS |
| TC10 sai quyền | FR06/US06/UC07, QT-14/NFR02; E11 | QLcenter1 gọi phiếu center2 CHUA/CHO | 404 che tồn tại, approved_by vẫn null | Response404, đọc bằng QL1+2 không metadata mới; PASS |
| TC11 đồng thời | FR06/US06/UC07, QT-05; E11 | Hai manager chờ khóa trên cùng phiếu | Một200, một409 ALREADY_APPROVED, không ghi đè người thắng | 200/409, actor21/note đầu giữ nguyên; PASS |
| TC12 liên thông | FR05/06/08, US05/06/08, UC05/07/06, QT-04/05/06/15; E09–E13 | Ghi trao đổi→xem queue→duyệt→detail→duyệt lại | can_proceed true, snapshot/SLA/status/log giữ nguyên, lặp409 | communication đúng actor, QL phone đầy đủ, giữ8 trường+1log; PASS |

Mapping UC theo API và nhật ký hiện hành: FR06→UC07, FR07→UC11, FR08→UC06. Các trường hợp mở rộng AUTH/CRUD là DESIGN đã duyệt, không tự tạo FR/QT nguồn.

## UI và bằng chứng bổ sung

UI01 đo100 lookup/200ticket. UI02 chạy tiếp nhận→tạo device không ngày mua→tạo phiếu (double click chỉ1POST)→trao đổi→QL duyệt, giữ MOI/hạn. UI03 kiểm loading/empty/error/retry ba màn hình, **tắt HTTP Backend thật rồi mở lại**; gate Playwright chỉ trì hoãn request thật. UI04 kiểm role/center, viewport375px, restart Backend→401 và token không ở storage.

Ảnh thật tại results/: screen-1-reception.png, screen-2-ticket.png, screen-3-approval.png; state-loading-reception.png, state-loading-intake.png, state-loading-approval.png; state-empty-reception.png, state-empty-history.png, state-empty-approval.png; backend-offline.png. Dữ liệu thuộc fixture test, không phải khách thật. Kết quả test, NFR02 và tổng số xem [phase-06](../progress/backend/phase-06.md), [NFR](nfr-evidence.md).

SOURCE: Đề BT2 — Mục2.1–2.3, tr.3–4 và checklist4.2 tr.8; Case Study — L2 tr.12, QT tại Bảng9.1 tr.19; DESIGN: SRS mục4–7, API gốc/phụ lục, DD02/05/06 và các phase trước. Bộ TC03/09 là dữ liệu sai, TC05/06 là biên, TC01/02/07 là luồng đúng, đáp ứng ba nhóm tối thiểu.
