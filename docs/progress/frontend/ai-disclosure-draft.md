# Dự thảo bổ sung khai báo AI — Frontend FE-01–07

Ngày: **25/10/2026**. Đây là nội dung để sinh viên đọc và điều chỉnh trước khi tự bổ sung vào [ai-disclosure.md](../../ai-disclosure.md). Không thay thế bản khai báo hiện có; không xác nhận sinh viên đã kiểm chứng.

| Công cụ | Mục đích | Phạm vi hỗ trợ | Kiểm chứng và trách nhiệm sinh viên |
| --- | --- | --- | --- |
| OpenAI Codex; Figma Console cho đối chiếu thiết kế | Khảo sát wireframe/API, lập lộ trình và hỗ trợ triển khai frontend L2 theo từng giai đoạn được giao | Ba kế hoạch trong `docs/plans/frontend-l2-*`; login, session/guard/khung giao diện, khách/thiết bị, phân loại/bảo hành/tạo phiếu, hàng chờ/chi tiết/lịch sử, phê duyệt và ghi trao đổi trong `src/frontend/`; helper fixture UI cách ly; kiểm thử và báo cáo FE-01–07 | Codex đã chạy các kiểm tra được ghi trong từng báo cáo. FE-07 có hồi quy local, kiểm thử UI production, Docker và NFR01–03; xem [báo cáo](phase-07.md) và [minh chứng](../../tests/frontend/phase-07/verification.md). Sinh viên cần đọc các phần được hỗ trợ, giải thích được luồng dữ liệu/quyền/transaction/SLA, tự chạy lại các kiểm tra phù hợp và ghi nhận kết quả thực tế của mình. |

Nội dung kiểm tra trước khi dùng bản khai báo:

- Đối chiếu FR01–08 → US/UC → A01/E01–E13 → component/service/test theo ma trận FE-07; phân biệt validation hỗ trợ nhập với quy tắc bắt buộc ở backend.
- Giải thích token trong RAM, server kiểm role/center, snapshot và hạn cam kết từ server, phê duyệt không đổi trạng thái Mới/bảo hành/SLA.
- Hiểu cách giữ bản nhập khi lỗi và vì sao POST chưa rõ kết quả không tự gửi lại; giới hạn của API khi chưa có ID/idempotency.
- Chạy thử bằng tài khoản local riêng; ghi rõ ngày, thao tác và kết quả sinh viên đã kiểm chứng. Các mục này hiện **CHƯA CÓ XÁC NHẬN CỦA SINH VIÊN**.
- Tự quyết định việc nghiệm thu, Git/commit/tag/push và nộp bài; không suy từ kết quả kỹ thuật rằng toàn bộ BT3 hoặc yêu cầu học phần đã được nghiệm thu.

Codex không sửa tài liệu nguồn, contract/SRS/schema, backend production hoặc dependency trong FE-07. Figma Console được dùng đọc/probe/tìm frame/chụp ba wireframe; không sửa file Figma. Danh sách thay đổi và giới hạn kiểm chứng nằm trong báo cáo từng phase.
