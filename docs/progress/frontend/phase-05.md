# FE-05 — Danh sách theo quyền và chi tiết chỉ đọc

Ngày: **25/10/2026**. Trạng thái: **HOÀN THÀNH phạm vi FE-05**. **FE-06/07 chưa bắt đầu**.

## 1. Rà soát điều kiện từ FE-04

Sinh viên yêu cầu kiểm tra FE-04, chỉ tiếp tục nếu không có blocker. Đã đọc [báo cáo FE-04](phase-04.md), trạng thái browser đã lưu, code và kế hoạch FE-05. **Không có blocker hoặc lỗi nghiêm trọng còn mở được ghi trong FE-04.** Các lỗi selector/timestamp và lời nhắc retry không phù hợp đã được sửa, kết quả cuối35/35 client và29/29 UI PASS.

Giới hạn E08 không idempotency/không tìm theo bản nhập, draft chỉ ở RAM, Docker/toàn backend suite chưa chạy lại được ghi rõ trong FE-04; chúng không ngăn phần đọc E09/E10/E12. Baseline trước FE-05 typecheck và35 test tiếp tục PASS. Lượt UI FE-05 chạy lại toàn29 case cũ và8 case mới đều đạt, không chỉ dựa vào báo cáo cũ để kết luận ổn định.

## 2. Căn cứ và phạm vi

- **DESIGN:** [Lộ trình](../../plans/frontend-l2-implementation-plan.md) — FE-05; [đặc tả màn hình](../../plans/frontend-l2-screen-spec.md) — Mục5/7.1/7.2/8; [API Contract](../../api-contract-l2.md) — Mục7.9/7.10/7.12, E09/E10/E12. SRS FR06/US06/UC07 trang15 và FR08/US08/UC06 trang17–18; mapping UC hiện hành theo contract.
- **SOURCE theo baseline đã đối chiếu:** Case Study Mekong Mobile — Bảng9.1 — trang19 — QT-14/15: phạm vi dữ liệu và che phone. Không bổ sung quy tắc hoặc đổi quyền server.
- **IMPLEMENTATION:** E09 chỉ QL, CHUA_XAC_MINH, chờ/đã duyệt, cũ trước; E10 đọc snapshot và phone theo role; E12 cũ trước, phân trang, đúng ticket/scope. Đối chiếu client/DTO, service/repository hiện tại và kết quả API thật.
- Đã đọc hướng dẫn Next cài sẵn về useSearchParams/Link, giữ Suspense và Promise params/searchParams hiện có. Không cần truy cập lại Figma vì đặc tả WF01/WF03 đã đủ cho phạm vi này; không tuyên bố thay wireframe nguồn.

**Không cần thay API backend.** Client chỉ bổ sung tham số size tùy chọn của E09 đã có trong contract để probe size1. Toàn bộ backend, kể cả helper UI, contract/SRS/schema/migration/config/seed/credential và dependency giữ nguyên.

## 3. Đã thực hiện

| File/thành phần | Nội dung |
| --- | --- |
| `screens/ticket-list-screen.tsx`, `tickets/ticket-table.tsx` | Bảng QL dùng summary/meta/sort, ba loại trạng thái và thời gian Việt Nam; filter reset page, quay lại giữ lựa chọn, tự sửa trang vượt tổng; NV ID validation/focus |
| `src/lib/ticket-list-query.ts` | Parser enum/page an toàn, builder query nội bộ và tính trang cuối từ metadata; không mang phone/token/return URL tùy ý |
| `app/(mekong-mobile)/tickets/[ticketId]/page.tsx` | Dùng parser chung, xử lý query string/array không hợp lệ, tạo return link đúng filter/page |
| `screens/ticket-detail-screen.tsx`, `tickets/ticket-detail.tsx` | Đọc E10 riêng, bố cục hai cột; kiểm ticket/nested ID response, lỗi404 chung; return link theo role; key theo ticket ID |
| `tickets/ticket-information.tsx` | Thông tin tiếp nhận, trạng thái Mới/bảo hành/phê duyệt riêng, snapshot/received/due/approval metadata; ID cho dữ liệu chưa có tên tham chiếu |
| `tickets/communication-history.tsx`, `ticket-read-error.tsx` | E12 riêng: loading/empty/error/retry/page/total, thứ tự server, ID actor, giờ Việt Nam; lỗi lịch sử không che chi tiết |
| `legacy/ticket-actions.tsx` | Tách JSX form ghi cũ; giữ dữ liệu/note/busy/error và luồng write→refresh tại parent, không triển khai cải tiến FE-06 |
| `legacy/ticket-detail.tsx` | Bỏ monolith đọc/ghi cũ sau thay thế; các hành vi ghi cũ vẫn qua adapter |
| `src/lib/api-client.ts`, `labels.ts`, CSS | E09 size mặc định10, hỗ trợ probe1; nhãn trạng thái/ưu tiên, bảng cuộn trong vùng, chi tiết responsive |
| Tests và tài liệu |4 nhóm unit/client,8 case UI API thật; giữ29 regression, cập nhật selector theo nhãn/empty mới và output phase-05 |

Đường dẫn rút gọn components trong bảng tính từ `src/frontend/src/components/`, `src/lib/` từ `src/frontend/`, route từ `src/frontend/`.

## 4. Quyết định và hành vi đáng chú ý

1. QL chỉ gọi E09 đúng filter và page/size. Bảng không tự có tên khách/nhóm/priority/description mà summary không trả; không N+1 E10. Không gọi catalog chỉ dành NV để dựng tên. Các cột trạng thái, bảo hành và phê duyệt tách riêng; sort received_at/ticket_id từ server, không đảo trong trang.
2. Filter/page được giữ trong query của link chi tiết và return link. Đổi filter về page1. Khi quay về, tải lại; nếu page đã vượt tổng mới thì điều hướng về trang hợp lệ theo meta. Không coi trang vượt tổng là toàn bộ rỗng.
3. E09 total0 ở page1: probe filter còn lại size1. Cả hai total0 mới báo chưa có phiếu chưa xác minh trong scope; filter còn lại có dữ liệu thì chỉ báo lựa chọn hiện tại rỗng. Probe lỗi thì dùng thông báo giới hạn theo lựa chọn, không suy toàn bộ hệ thống rỗng.401/STALE_REQUEST tiếp tục qua cơ chế phiên cũ.
4. NV chỉ mở ID integer dương an toàn, không tìm mã BH-…/phone hoặc gọi E09. Dữ liệu nhập sai không request; focus lỗi và Enter hoạt động. Có đường về tiếp nhận. QL về danh sách kèm query; NV về intake, không bị đưa tới bảng không có quyền.
5. E10 hiển thị đúng response: customer/device IDs, serial, product/category/center IDs, priority/issue, snapshot và metadata phê duyệt. Không dùng ngày mua hiện tại/E07 để tính lại lịch sử, không hiển thị người đang login như người tạo phiếu. Ngày thuần YYYY-MM-DD; timestamp dùng formatter Việt Nam đã kiểm ở FE-04 và giữ ISO trong time datetime.
6. E12 chỉ bắt đầu sau khi E10 đọc được đúng phiếu. Tải/retry/chuyển trang lịch sử không tải lại E10; lỗi E12 giữ toàn bộ chi tiết. Kiểm mọi message thuộc ticket đang mở, dùng communication_id làm key, giữ cũ trước theo server, hiển thị người ghi bằng ID. Không status timeline giả.
7. Đổi ID remount parent và xóa page/content/note/error cũ. Hook useRemote loại response cũ khi request/ID đã đổi. Snapshot lịch sử vẫn đọc được khi customer/device đã ngừng nếu backend cho phép;404 thiếu hoặc ngoài scope dùng cùng thông báo.
8. Form ghi E11/E13 được giữ từ Phase6 để không regression. Chỉ thích ứng refresh với phần đọc tách riêng; validation Unicode/chống submit lặp tức thời/recovery và trang chứa trao đổi mới vẫn thuộc FE-06. Không coi tách JSX là đã hoàn thành FE-06.

Không thêm thư viện, state store, endpoint hay dữ liệu tham chiếu. Browser dùng các API hiện có để tạo23 trao đổi, sửa/ngừng hồ sơ và duyệt dữ liệu chỉ trong schema cách ly do helper tạo; helper/backend không sửa. Bảng có vùng cuộn ngang focus được khi màn hình hẹp; các phần còn lại không tràn viewport.

## 5. Kiểm chứng thực tế

Các lệnh từ root project:

| Lệnh/kiểm tra | Kết quả | Bằng chứng/giới hạn |
| --- | --- | --- |
| Baseline frontend typecheck/test | PASS |35/35 trước sửa |
| `npm --prefix src/frontend run typecheck` | PASS | TS strict, code/tests FE-05 |
| `npm --prefix src/frontend run lint` | PASS | Không bỏ rule hoặc ép kiểu bỏ lỗi |
| `npm --prefix src/frontend test` | PASS |39/39,0 fail/skip;35 regression +4 F-U36–39 |
| `npm --prefix src/frontend run build` | PASS | Next production,9 route; Promise searchParams/Suspense phù hợp bản cài |
| `npm run test:ui` | PASS |37/37 trong1,3 phút;29 regression và8 FE-05, API/PostgreSQL thật |
| Dữ liệu public | PASS | `UI_FIXTURE_PUBLIC_PRESERVED`; fingerprint trước/sau, chỉ dọn schema test |
| Responsive/ảnh | PASS trong FE-05 | Assertion không tràn ngang1920/1280/768/375; đã xem queue/detail desktop và mobile |
| Toàn root `npm test`/backend suite | NOT RUN trong FE-05 | Backend không sửa; UI liên quan chạy thật |
| Docker/clean-room/NFR03 | NOT RUN trong FE-05 | Không suy từ build/browser local thành kết quả container |

FE-05 không có lần test FAIL trong các bộ kiểm tra đã chạy. Không tuyên bố đã kiểm mọi rủi ro từ một lượt PASS. Lệnh dùng quyền phù hợp với môi trường đã xác định ở các phase trước; không sửa .env/config để né lỗi chạy.

### Client/unit mới

F-U36: enum/page/array/unsafe và query nội bộ an toàn; F-U37: total0/đủ trang/dư1; F-U38: summary không cần field detail, E09 probe size1 và chỉ1 call; F-U39: E12 page3 giữ ID/actor/thứ tự response, không kéo E10.

### Browser mới

| Mã | Đã kiểm qua API thật |
| --- | --- |
| FE05-UI01 | QL đúng meta và thứ tự IDs của server, không N+1/catalog; link detail→về đúng filter/page; đổi filter về1 |
| FE05-UI02 |23 trao đổi qua3 trang, đúng IDs/thứ tự/actor; E12 lỗi/retry vẫn có E10, chuyển trang không đọc lại E10 |
| FE05-UI03 | PATCH ngày mua rồi soft delete customer/device; E10/E12 vẫn lịch sử, snapshot/hạn bất biến, NV phone che/QL phone thật do server |
| FE05-UI04 | ID thiếu/0/âm/thập phân/unsafe/mã BH bị chặn và focus; ngoài scope404 không profile/E12; NV không E09 |
| FE05-UI05 | Duyệt hết trang cuối qua API fixture rồi quay về; tự tải trang hợp lệ và meta mới |
| FE05-UI06 | Scope cả hai filter rỗng, pending rỗng nhưng approved có, probe lỗi; thông báo không suy rộng sai |
| FE05-UI07 | History cũ trả muộn sau đổi ID không đưa nội dung/draft của phiếu trước vào phiếu mới |
| FE05-UI08 | Bảng/chi tiết4 viewport, region bảng focus được; time format/ISO; reload guard không GET ticket trước login |

NFR01 regression local:200 phiếu,1 warm-up,100/100 dưới1500ms; p95≈48,2ms, max≈48,6ms. Xem [raw JSON](../../tests/frontend/phase-05/nfr01-local.json), không coi đây là nghiệm thu toàn FE-07.

## 6. Minh chứng và bảo toàn

[Verification](../../tests/frontend/phase-05/verification.md), [log UI đầy đủ](../../tests/frontend/phase-05/browser-run.txt), [queue desktop](../../tests/frontend/phase-05/queue-1280.png), [detail desktop](../../tests/frontend/phase-05/detail-1280.png), [mobile](../../tests/frontend/phase-05/detail-375.png), [history trang3](../../tests/frontend/phase-05/history-page-3.png), [snapshot](../../tests/frontend/phase-05/detail-snapshot.png).

[File audit](../../tests/frontend/phase-05/file-audit.json) so SHA-256 với snapshot283 tệp trước FE-05; kiểm toàn backend/helper, dependency, contract/SRS/schema, auth và intake FE-03/04, evidence/báo cáo trước. Không Git, commit/push, sửa nguồn hoặc AI disclosure. Client chỉ đổi tham số size E09, không sửa cơ chế phiên/DTO.

## 7. Giới hạn và điểm dừng

Không có blocker mới còn mở trong phạm vi FE-05 sau các kiểm tra đã chạy. **Dừng sau FE-05**, chưa triển khai FE-06/07.

Giữ các giới hạn contract: NV không có danh sách/tìm mã/phone; QL không có tên product/category/employee từ catalog; chưa có status log API. Chỉ dùng ID và dữ liệu thật. Filter/page được giữ khi điều hướng trong phiên; reload mất phiên và cần login lại, không bổ sung persist token/query trong auth. E12 lỗi không khẳng định phiếu không có trao đổi.

E11/E13 còn các cải tiến validation/recovery và xác nhận sau ghi của FE-06; những thao tác cũ đã được regression, không phải nghiệm thu đầy đủ phase tiếp theo. Giới hạn E08 chưa idempotency và draft RAM của FE-04 giữ nguyên. Docker/full backend suite/accessibility toàn diện chưa được kiểm lại trong FE-05. Sinh viên cần tự review/chạy thử để xác nhận cá nhân; Codex không ghi thay khai báo AI.
