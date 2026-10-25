# Minh chứng NFR01–03 — Phase 6

Ngày 2026-10-25. **DESIGN:** SRS mục 5.1–5.3, Bảng 12–14, tr.19–20. **IMPLEMENTATION:** kết quả chạy bên dưới. Không quy đổi một phép kiểm hẹp thành bảo đảm tổng quát.

| Mã | Expected | Phương pháp / actual | Kết quả và giới hạn |
| --- | --- | --- | --- |
| NFR01 | Local 200 ticket, 100 lookup gồm tồn tại/không; ít nhất 95% hiển thị dưới 1500ms | UI01: 50 có/50 không, một warm-up ngoài mẫu; click handler→DOM commit+2 animation frame; 100/100 đạt, p50 46.8ms, p95 48ms, max 48.5ms | PASS cấu hình đo; không chỉ HTTP latency; chưa kiểm tải đa người dùng/máy yếu |
| NFR02 | Chỉ QL đúng scope duyệt; mọi request trái quyền bị chặn, dữ liệu không đổi | P5-I12 chạy lại: 9/9 bị chặn đúng 401/403/404; hash 7 bảng trước/sau từng lượt khớp; TC10/11 kiểm thêm scope và đồng thời | PASS tập hữu hạn; không bảo mật tuyệt đối |
| NFR03 | Sau tải source và chuẩn bị config, Docker/Compose chạy Frontend/API/DB trong không quá hai lệnh; không cần Node/PG riêng | Clean-room copy 133 file, bỏ env/private/deps/build; config/volume mới; up --build -d --wait + cp password demo; ba healthy, API/UI/verify và lần chạy lại PASS | PASS cấu hình đã thử; chuẩn bị env được công khai, lần build đầu cần mạng |

## NFR01: môi trường và dữ liệu thô

Intel Core i9-14900HX, 32 logical CPU, RAM 33,959,649,280 byte (~31.63GiB), Windows 10.0.26300 (Windows 11), Node 24.18.0, PostgreSQL 18.6, Chromium 156.0.8078.4/Playwright 1.64.1. Next production standalone qua proxy cùng origin → Express thật → PostgreSQL. Schema test có đúng 200 ticket trước đo. Không giả response nghiệp vụ.

Mốc đầu là performance.now ở handler tra cứu; mốc cuối sau React commit kết quả và hai requestAnimationFrame. Hai frame là mốc render phía trình duyệt, không thiết bị đo màn hình vật lý. Một lượt warm-up không tính vào 100 mẫu. Xen kẽ 50 số tồn tại và 50 không tồn tại, tuần tự, browser warm, không mô phỏng mạng xa.

[100 mẫu và timestamp](results/nfr01-local.json). Container clean-room cũng chạy UI01: 100/100 đạt, p95 khoảng 47.9ms, max 48.1ms; không trộn với số local. Chạy lại sẽ ghi phép đo mới, phải dẫn đúng artifact/timestamp.

## NFR02: tập request

| ID | Trường hợp | Actual |
| --- | --- | --- |
| N01 | Anonymous | 401 |
| N02 | Token không hợp lệ | 401 |
| N03 | Nhân viên tiếp nhận | 403 |
| N04 | QL ngoài phạm vi trung tâm | 404 |
| N05 | NV giả mạo header | 403 |
| N06 | NV giả mạo body | 403 |
| N07 | Token hết hạn | 401 |
| N08 | Account bị vô hiệu hóa sau login | 401 |
| N09 | Account inactive không có session | 401 |

Tất cả gọi API trực tiếp, kiểm status/envelope và so hash dữ liệu trước/sau từng request; không chỉ dựa vào nút UI bị ẩn. QL hợp lệ và hai QL cạnh tranh được kiểm riêng, kết quả 200/409. [JSON 9 lượt](results/nfr02-phase6.json), [log](results/final-local-test.txt).

## NFR03: startup và persistence

Làm đúng [README root](../../README.md), Docker Engine 29.9.2/Compose 5.6.1. Container thực tế Node 24.22.1/PostgreSQL 18.6. Host Node dùng cho công cụ kiểm chứng ngoài; startup và image verify tự có runtime, không cần cài Node/PG trên máy dựng.

Clean-room dùng project l2p6clean_20261025, ports 3140/3141; stack thử đầu l2p6_2f208f87, ports 3130/3131. PostgreSQL không publish cổng host. Sau chuẩn bị env riêng, hai lệnh:

```powershell
docker compose --env-file .env.compose -p l2p6clean_20261025 up --build -d --wait
docker compose --env-file .env.compose -p l2p6clean_20261025 cp backend:/app/.private/demo-passwords.local.json demo-passwords.local.json
```

Sau API và UI smoke, volume test có 32 customer/32 device/6 category/202 ticket/202 log/33 communication. Down/up giữ volume; migration trả [] và hai lần seed tickets_created=0. Hash toàn bộ hàng 7 bảng, sequence và credential khớp trước/sau. Token trước restart trả 401; login mới đọc được ticket/trao đổi/snapshot. Seed giữ các thay đổi PATCH/soft delete/approval/communication của smoke.

Đây là volume test riêng, không database development public. Initializer với credential lỗi trả CONFIGURATION_ERROR, exit khác 0 và không chạy API. Sau khi thu minh chứng, đã dọn đúng hai stack/bốn volume test với ownership check, không đụng volume người dùng.

[Summary](results/verification-summary.json), [clean-room test log](results/clean-room-test.txt), [public preservation](results/public-preservation.json), [cleanup](results/cleanup.json). Docker là mức nâng cao BT2 mục 2.4; riêng SRS dự án yêu cầu NFR03 fullstack này. Không dùng Docker thay cho ba màn hình hoặc xác nhận commit/tag/nộp bài.
