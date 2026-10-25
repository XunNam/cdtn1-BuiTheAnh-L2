# Khai báo sử dụng công cụ AI

- **Học phần:** Chuyên đề tốt nghiệp 1
- **Chuyên ngành:** Kỹ thuật Phần mềm
- **Luồng nghiệp vụ:** L2 – Tiếp nhận và phân loại yêu cầu bảo hành, Case study Mekong Mobile Smart CRM.

| Công cụ | Dùng vào việc gì | Áp dụng ở phần nào | Đã kiểm chứng thế nào |
| --- | --- | --- | --- |
| OpenAI ChatGPT | Gợi ý cách diễn đạt phạm vi prototype; phân biệt chức năng thuộc L2 với các phụ thuộc ảnh hưởng đến L2. | Phiếu phạm vi; phần giới thiệu và phạm vi trong SRS. | Đã đọc và kiểm tra lại mục 1.1 (Giới thiệu), 1.2 (Phạm vi) |
| OpenAI ChatGPT | Gợi ý bản nháp User Story, Functional Requirement và Acceptance Criteria theo Given–When–Then, góp ý bổ sung và chỉnh sửa yêu cầu. | Các bảng US, FR và AC trong SRS. | Đã đọc và kiểm tra 8 User Story, 8 FR, 3 NFR và các AC của các FR, NFR |
| OpenAI ChatGPT | Đề xuất phân loại mức ưu tiên MUST/SHOULD và giải thích cách áp dụng MoSCoW. | Bảng ưu tiên User Story/yêu cầu. | Đã đọc và kiểm tra tính hợp lý của các mức ưu tiên cho các User Story, FR, NFR phù hợp với yêu cầu quy tắc nghiệp vụ của bài |
| OpenAI ChatGPT | Rà soát cách mô tả NFR, ngưỡng đo và phương pháp kiểm chứng, hỗ trợ liên kết NFR với quyết định thiết kế. | Bảng NFR trong SRS. | Đã đọc và kiểm tra các NFR, đảm bảo mỗi yêu cầu đều có ngưỡng đo bằng số, từ đó giải thích lựa chọn kiến trúc |
| OpenAI ChatGPT, OpenAI Codex, Google Gemini, Google Antigravity | Đối chiếu Use Case Diagram với bảng truy vết, góp ý về mã, actor, quan hệ và sự nhất quán giữa các yêu cầu. | Use Case Diagram; bảng truy vết yêu cầu. | Đã chỉnh sửa bảng truy vết qua các phiên bản và đối chiếu với User Story và các FR |
| OpenAI Codex, Google Antigravity | Soạn bản nháp API Contract từ FR, US, UC và tài liệu nguồn; đề xuất endpoint, request, response và xử lý lỗi. | Tài liệu API Contract. | Đã đọc và đối chiếu với các yêu cầu được đưa ra trong tài liệu đặc tả chuyên ngành. |
| OpenAI Codex, Google Antigravity | Sinh bản nháp SQL DDL Skeleton cho PostgreSQL, gồm cấu trúc bảng, khóa và ràng buộc phục vụ L2. | SQL DDL Skeleton; phần mô hình dữ liệu. | Đã đọc và đối chiếu với mô hình dữ liệu theo chuyên ngành |
| OpenAI ChatGPT | Gửi yêu cầu soạn ba mẫu lập luận lựa chọn kiến trúc dựa trên các NFR của đề tài. | Phần ba câu lập luận kiến trúc | Đã tham khảo và viết lại 3 câu lập luận kiến trúc phù hợp với mẫu tài liệu đưa ra |
| OpenAI Codex + Local Figma MCP Server | Gửi yêu cầu hỗ trợ tạo ba wireframe tĩnh dựa trên SRS, ưu tiên các chức năng và luồng chính. | Ba wireframe của L2. | Đã xem qua ba màn hình danh sách phiếu bảo hành, tạo phiếu bảo hành và chi tiết phiếu bảo hành, đối chiếu với các FR đã ghi |
| Open AI Codex, OpenAI ChatGPT | Đối chiếu báo cáo với các mục kiểm chứng của học phần, chỉ ra nội dung thiếu và gợi ý cách bổ sung. | Báo cáo Buổi 4 và quá trình hoàn thiện hồ sơ BT1. | Đã đọc và chỉnh sửa các yêu cầu chức năng, các AC bị thiếu nhất quán. Chỉnh sửa Usecase Diagram thiếu luồng ngoại lệ |
| OpenAI ChatGPT | Soạn bản nháp bảng khai báo sử dụng AI từ tài liệu nguồn và lịch sử hỗ trợ. | Phụ lục khai báo sử dụng AI. | Đã đọc và tự kiểm tra và chỉnh sửa từng mục công việc theo sử dụng thực tế |

## Cam kết

Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung nộp.

- **Họ và tên:** Bùi Thế Anh
- **MSSV:** 2374802010009
- **Ngày:** 11/10/2026
## Dự thảo cập nhật BT2 — OpenAI Codex (2026-10-25)

Phần dưới là **dự thảo**, giữ nguyên lịch sử BT1 phía trên. Các tuyên bố kiểm thử là việc Codex thực sự chạy; không xác nhận thay sinh viên đã đọc/hiểu/tự chạy. Sinh viên cần đối chiếu những phase trước, sửa phạm vi nếu khác thực tế và hoàn tất TODO trước khi nộp.

| Công cụ | Dùng vào việc gì | Áp dụng ở tệp/hàm nào | Em đã kiểm chứng thế nào |
| --- | --- | --- | --- |
| OpenAI Codex | Hỗ trợ thiết kế Minimal Backend và chốt kiến trúc/schema/contract đã được yêu cầu trong Phase1 | docs/progress/backend/phase-01.md, decision-log.md; mapping/DDL/phụ lục được ghi tại nhật ký | Codex đã kiểm tĩnh; **TODO sinh viên:** đối chiếu quyết định và tự giải thích các DD/DEP/AUTH/CRUD |
| OpenAI Codex | Foundation migration/seed/config/auth, chuẩn hóa và CRUD Customer/Device ở Phase2–3 | src/backend/src/db.ts, migrate.ts, seed.ts, credentials.ts, auth.ts, routes/services/repositories customers/devices, validators | Codex đã chạy type/build/unit/HTTP/PG và regression Phase6; **TODO sinh viên:** đọc source, chạy lại, ghi cách tự kiểm tra normalize/mask/soft delete/seed |
| OpenAI Codex | Warranty/SLA/intake/approval/communication Phase4–5 | src/backend/src/domain/, services/tickets.service.ts, repositories/tickets.repository.ts, communications.repository.ts; các bài test intake/history | Codex đã chạy biên ngày/tháng/Chủ nhật, transaction/lock/concurrency và9 lượt NFR02; **TODO sinh viên:** đọc/giải thích hàm và tự kiểm nghiệm nhánh nghiệp vụ |
| OpenAI Codex | Ba màn hình, API client/DTO/proxy/login và lỗi tích hợp Phase6 | src/frontend/src/components/l2-app.tsx, src/lib/api-client.ts, contracts.ts, app/api/[...path]/route.ts | Codex đã chạy12 client tests,12 case HTTP/PG,4 UI tests và UI02 trên Compose; **TODO sinh viên:** tự trình diễn, kiểm role/center/loading/empty/error và giải thích token RAM |
| OpenAI Codex | Đóng gói/tái lập/NFR/minh chứng và sửa lỗi dependency gián tiếp | Dockerfile, compose.yaml, scripts/test-all.mjs, compose-smoke.mjs, compose-fingerprint.mjs, src/backend/scripts/ui-test.ts, packaging tests, README và docs/tests/** | Codex đã build/run/restart/seed2lần/clean-room, đo100 lookup và so hash public/credential; **TODO sinh viên:** chạy README trên máy hoặc môi trường của mình, ghi kết quả/cấu hình thực |
| OpenAI Codex | Rà tài liệu/truy vết và soạn dự thảo khai báo | docs/architecture-thuc-te.md, docs/progress/backend/phase-06.md, docs/thay-doi-thiet-ke.md và phần dự thảo này | **TODO sinh viên:** đọc, sửa theo hiểu biết cá nhân, xác nhận file/hàm thực sự sử dụng; không nộp nguyên trạng khi chưa hiểu |

**Chưa có xác nhận** sinh viên tự kiểm chứng code Phase1–6 trong bảng mới này. Không tự tạo lời cam kết ngày mới, điểm số, commit/tag v0.2 hoặc kết luận đã nộp BT2.
