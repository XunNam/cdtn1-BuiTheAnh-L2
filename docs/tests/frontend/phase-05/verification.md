# FE-05 — Minh chứng danh sách và phần đọc chi tiết/lịch sử

Ngày: **2026-10-25**. **IMPLEMENTATION**. [Báo cáo FE-05](../../../progress/frontend/phase-05.md).

## Kết quả

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Baseline frontend typecheck/test | PASS35/35 trước sửa |
| Frontend typecheck/lint/build | PASS;9 route, không thêm endpoint |
| Frontend unit/client | PASS39/39,0 fail/skip;4 nhóm F-U36–39 |
| Browser production + API/PostgreSQL thật | PASS37/37,1,3 phút;8 FE-05 +29 regression |
| Public fingerprint | PASS `UI_FIXTURE_PUBLIC_PRESERVED` |
| Backend suite/root npm test | NOT RUN trong FE-05; backend không đổi |
| Docker/clean-room/NFR03 | NOT RUN trong FE-05 |

[Log UI đầy đủ](browser-run.txt) ghép nguyên các đoạn output thực tế theo thứ tự, không tạo kết quả giả. Bộ kiểm tra FE-05 đã chạy không có FAIL; kết luận giới hạn theo phạm vi kiểm chứng, không phải bảo đảm không tồn tại lỗi nào.

## Tái lập

Chuẩn bị dependency, PostgreSQL và Chromium theo root README. Chạy từ root:

```powershell
npm --prefix src/frontend run typecheck
npm --prefix src/frontend run lint
npm --prefix src/frontend test
npm --prefix src/frontend run build
npm run test:ui
```

Helper tạo schema/cổng/credential tạm, so fingerprint7 bảng public trước/sau, dọn đúng schema được tạo. FE-05 không sửa helper; browser dùng API thật để tạo fixture,23 trao đổi, duyệt nhóm phiếu, PATCH ngày mua và soft delete customer/device trong schema cách ly. Không mock response nghiệp vụ để báo tích hợp; lỗi E12/probe được tạo bằng ngắt truyền của request thật.

## Bằng chứng theo kịch bản

| Mã | Nội dung đã kiểm |
| --- | --- |
| FE05-UI01 | E09 đúng meta/thứ tự ID server, không N+1 E10/catalog, return filter/page và đổi filter về1 |
| FE05-UI02 |23 trao đổi qua3 trang, đúng message ID/actor, E12 lỗi/retry không mất E10 hoặc đọc lại E10 |
| FE05-UI03 | Snapshot/hạn giữ nguyên sau PATCH ngày mua và soft delete parent/device; lịch sử còn đọc; phone NV/QL theo server |
| FE05-UI04 | ID sai bị chặn/focus, ngoài scope404 không profile hoặc E12; NV không gọi E09 |
| FE05-UI05 | Trang cuối mất hết dữ liệu sau duyệt: về đúng page hợp lệ/meta mới khi quay từ detail |
| FE05-UI06 | Phân biệt scope chưa có phiếu với filter rỗng; probe lỗi chỉ thông báo theo lựa chọn |
| FE05-UI07 | Đổi ID khi history cũ đang chậm không lẫn dữ liệu/draft |
| FE05-UI08 |4 viewport, bảng focus/cuộn trong vùng, time format/ISO; reload không GET ticket trước login |

F-U36–39 kiểm parser/builder query, trang cuối0/đủ/dư1, E09 size1/summary thiếu field detail và E12 query/order/ID/actor không tự gọi E10. Đây là unit/client transport kiểm soát;8 case browser mới và29 regression là bằng chứng API/PostgreSQL thật.

Các assertion cũ giữ ý nghĩa: status text đổi sang “Mới” và kiểm thêm data-value=MOI; thông báo empty mới kiểm cả hai filter; luồng tạo→receipt→detail→trao đổi→QL duyệt vẫn chạy. Không bỏ assertion chỉ để làm test xanh.

## Ảnh browser

| Ảnh | Nội dung |
| --- | --- |
| [Queue1920](queue-1920.png), [1280](queue-1280.png), [768](queue-768.png), [375](queue-375.png) | Bảng đúng field summary, ba loại trạng thái và giờ Việt Nam; cuộn ngang nằm trong vùng bảng |
| [Detail1920](detail-1920.png), [1280](detail-1280.png), [768](detail-768.png), [375](detail-375.png) | Hai cột desktop, một cột nhỏ; snapshot/metadata và lịch sử tách riêng |
| [History trang3](history-page-3.png) |3 item cuối trong23 trao đổi, tổng/meta/thứ tự thật |
| [Snapshot](detail-snapshot.png) | Phiếu vẫn giữ ngày mua snapshot thiếu dù hồ sơ đã sửa/ngừng |
| [Filter rỗng](queue-filter-empty.png) | Lựa chọn chờ không có nhưng tập đã duyệt có dữ liệu |

Đã xem queue/detail desktop và mobile; browser kiểm document không tràn ngang ở4 viewport. Không suy thành kiểm định accessibility hoặc hoàn thiện thị giác toàn FE-07.

## NFR và bảo toàn

[Raw NFR01](nfr01-local.json), lúc `2026-10-25T08:18:23.637Z`: fixture200 phiếu,1 warm-up,100 mẫu click→DOM cộng2 animation frame;100/100 dưới1500ms, p95≈48,2ms, max≈48,6ms. Đây là regression local, không phải kết quả container hoặc toàn FE-07.

[File audit](file-audit.json) so SHA-256 với283 tệp snapshot trước FE-05; kiểm toàn backend/helper, dependency, API Contract/SRS/schema, auth/intake và evidence/báo cáo cũ. Client chỉ đổi size E09; logic DTO/auth giữ nguyên. Tập snapshot có giới hạn, không phải audit bảo mật toàn repo.

FE-06/07 chưa bắt đầu. Form E11/E13 còn hành vi kế thừa và các cải tiến đã lên kế hoạch; xem [giới hạn/điểm dừng](../../../progress/frontend/phase-05.md).
