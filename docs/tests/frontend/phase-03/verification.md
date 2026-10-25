# FE-03 — Minh chứng khách hàng và thiết bị

Ngày: **2026-10-25**. **IMPLEMENTATION**, không thay kế hoạch nghiệm thu BT3. Báo cáo: [FE-03](../../../progress/frontend/phase-03.md).

## Kết quả thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend typecheck/lint | PASS, đã xác nhận lại sau gián đoạn |
| Frontend client/validation/session | PASS29/29;7 nhóm mới F-U23–29 |
| Backend typecheck | PASS, bao gồm helper test UI |
| Frontend production build | PASS bản mã cuối trước gián đoạn;9 route, không đổi code sau build |
| UI production + API/PostgreSQL thật | PASS20/20; lượt cuối45,9 giây,8 FE-03 +12 regression |
| Public data fingerprint | PASS, `UI_FIXTURE_PUBLIC_PRESERVED` |
| Backend suite đầy đủ/root npm test | NOT RUN trong FE-03 |
| Docker/clean-room/NFR03 | NOT RUN trong FE-03 |

Chạy lại từ root: frontend `typecheck`, `lint`, `test`, `build` qua `npm --prefix src/frontend ...`; backend `npm --prefix src/backend run typecheck`; UI `npm run test:ui` sau build và với điều kiện PostgreSQL/Chromium trong README. Không gọi Playwright trực tiếp khi thiếu fixture.

## Dữ liệu và cách thử

- Harness tạo schema/cổng/credential tạm riêng; kiểm fingerprint public trước/sau và chỉ dọn schema do chính lượt chạy tạo.
- 101 sản phẩm chỉ thêm vào reference config trong RAM của harness, tổng104 active; không sửa config demo/seed. Trạng thái all-inactive dùng để kiểm E05 rỗng. Browser tạo105 thiết bị trong schema cách ly, kiểm đủ11 trang E03 và sản phẩm1101 ở trang6 E05.
- Các400/409 do backend thật trả. Loading dùng trì hoãn request thật; lỗi mạng dùng ngắt truyền. Kịch bản mất kết quả ghi gọi API thật cho commit rồi bỏ response, kiểm phục hồi bằng GET và không gửi lại POST.
- Giữ assertion nghiệp vụ cũ; chỉ chuyển selector loading/error/retry vào vùng phân loại tương ứng và đổi thao tác chọn lại thiết bị cho bố cục mới.
- Output mới nằm trong phase-03; evidence phase trước được so hash tại [file-audit.json](file-audit.json).

## Ảnh thật từ browser

| Minh chứng | Nội dung |
| --- | --- |
| [1920px](intake-1920.png), [1280px](intake-1280.png) | Khách/thiết bị và vùng phân loại cùng màn hình; tên chủ đúng customer |
| [768px](intake-768.png), [375px](intake-375.png) | Bố cục một cột, serial50 code point không tràn ngang |
| [Phân trang](intake-pagination.png) | Chọn sản phẩm sau bản ghi100, giữ lựa chọn khi đổi trang |
| [Catalog rỗng](intake-empty-catalog.png) | E05 rỗng thật trong fixture; vẫn chọn được thiết bị đã có |
| [Phục hồi](intake-recovered.png) | GET lấy lại thiết bị sau POST commit nhưng mất phản hồi |
| [Phiếu](screen-2-ticket.png), [phê duyệt](screen-3-approval.png) | Regression luồng thiếu ngày mua → tạo → trao đổi → quản lý duyệt |
| [Login](login-1280.png), [lỗi mobile](login-validation-mobile.png) | Regression FE-02 |

Đã xem ảnh FE-03 desktop/mobile, phân trang và catalog rỗng; browser assertion không tràn ngang1920/1280/768/375px. Đây không phải đánh giá accessibility hay hoàn thiện thị giác toàn FE-07.

## NFR01 local kế thừa

[nfr01-local.json](nfr01-local.json), đo lúc `2026-10-25T07:21:28.112Z`: fixture200 phiếu,1 warm-up riêng,100 mẫu click handler→DOM commit cộng2 animation frame.100/100 dưới1500ms; p95≈47,9ms; max≈48,2ms. Đo Next production qua proxy cùng origin và Express/PostgreSQL thật trên máy local; không suy thành kết quả hạ tầng khác hoặc toàn FE-07.

Giới hạn và phần tiếp theo được ghi trong [báo cáo FE-03](../../../progress/frontend/phase-03.md). FE-04 chưa bắt đầu.
