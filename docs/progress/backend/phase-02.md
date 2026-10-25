# Phase 2 — Backend Foundation

**Ngày nghiệm thu:** 2026-10-24, Asia/Saigon  
**Trạng thái:** HOÀN THÀNH  
**Phạm vi:** Foundation và AUTH được giao; không triển khai E01–E13/bốn CRUD, không Git, không sửa Frontend hoặc tự chuyển Phase 3.

## A. Mục tiêu và căn cứ

Xây dựng Backend Express/TypeScript với PostgreSQL thật, migration/seed tái lập, DEP-A, validation/error/transaction, HTTP login/Bearer/principal/authorization, test và README. Nguồn ủy quyền: yêu cầu sinh viên “Triển khai Phase 2: Backend Foundation” và bổ sung môi trường PostgreSQL riêng trong lượt hiện tại.

Đã kiểm AGENTS/kế hoạch và baseline Phase 1: báo cáo, decision log, schema, API gốc/phụ lục, mapping/kiến trúc, nhật ký thay đổi và SRS. Snapshot SHA-256 đầu lượt có57 tệp, không khác kết quả Phase 1. Không có quyết định nghiệp vụ đã duyệt cần hỏi lại. DDL có sáu bảng/51 cột, đúng center/product/deleted_at, không DEFAULT12, CHECK cho phép thiếu ngày mua chờ/đã duyệt.

Phần kế hoạch cũ nói seed phụ trợ hoặc chờ chọn AUTH được áp dụng theo quyết định mới hơn DEP-A/AUTH đã được sinh viên chấp thuận: config thay bảng phụ trợ và HTTP login theo phụ lục. Không sửa kế hoạch/contract để che lịch sử.

Truy vết: BT2 về nền tảng/migration/seed/đăng nhập/test và tái lập; NFR02/QT-14/15 cho xác thực/quyền/privacy; QT-13 và snapshot/history được bảo toàn ở schema/seed/transaction. Chi tiết nguồn/mục/trang tại [mapping Phase1](../../../src/backend/docs/contract-schema-mapping.md). Đây là IMPLEMENTATION đã kiểm, không phê duyệt mới của giảng viên hoặc thay đổi8 FR/US.

## B. Công việc đã hoàn thành

- Tách app.ts khỏi server.ts; startup kiểm env/reference/credential/migration/ID lịch sử trước listen, shutdown đóng session/HTTP/pool.
- PostgreSQL là kho nghiệp vụ, xóa store.ts/router mẫu. Chỉ public POST /api/auth/login; endpoint chưa triển khai trả404 envelope, không route giả public.
- Driver pg, pool và transaction một connection; error/validation dùng lại cho phase sau. Không ORM/DI/CQRS/event bus.
- Hai migration SQL có checksum/version và khóa chạy chồng; đúng sáu bảng nghiệp vụ + schema_migration và sequence kỹ thuật.
- Config DEP-A JSON có version/deep freeze; repository kiểm ID phụ trợ kể cả tombstone và actor inactive.
- Seed fixture v1 cố định, nguyên tử, natural key/idempotent, không ghi đè sửa đổi vận hành hoặc lịch sử.
- HTTP login/scrypt/random token/digest session/TTL/cap/cleanup; role/center từ server, không client tự khai.
- Type-check/build, unit/HTTP/PostgreSQL integration và compiled startup/login/shutdown đã chạy thực tế.
- .env local và private credential được bảo vệ bởi .gitignore; .env.example chỉ placeholder. Không đưa mật khẩu, token, hash/salt private hoặc connection string xác thực vào README/báo cáo.

## C. Tệp tạo/sửa/xóa

Danh sách dưới đây tính theo tệp nguồn/cấu hình/tài liệu được khảo sát, không liệt kê từng dependency/build artifact sinh ra:

| Thao tác | Tệp | Lý do |
| --- | --- | --- |
| Sửa | .gitignore | Bảo vệ .private cùng .env đã có |
| Sửa | docs/thay-doi-thiet-ke.md | TD-12: ghi nhận hiện thực Foundation |
| Sửa | docs/progress/backend/decision-log.md | Các quyết định TECH và kết quả Phase 2 |
| Sửa | src/backend/package-lock.json | Khóa dependency pg/@types/pg và metadata package |
| Sửa | src/backend/package.json | Scripts thật, pg driver, Node engine |
| Sửa | src/backend/src/server.ts | Startup foundation, listen và shutdown |
| Tạo | src/backend/.env | Cấu hình local được cấp; bị ignore, không liệt kê giá trị |
| Tạo | src/backend/.env.example | Placeholder, không secret |
| Tạo | src/backend/README.md | Setup bốn bước, scripts, login/test và giới hạn |
| Tạo | src/backend/tsconfig.build.json | Build riêng source, giữ strict từ tsconfig gốc |
| Tạo | src/backend/config/reference.demo.json | DEP-A fixture metadata có version, không secret |
| Tạo | src/backend/migrations/001_core_schema.sql | Sáu bảng theo DDL Phase 1 |
| Tạo | src/backend/migrations/002_indexes_and_ticket_sequence.sql | Năm index và sequence mã phiếu |
| Tạo | src/backend/src/app.ts | Express/login HTTP, không listen hoặc SQL |
| Tạo | src/backend/src/auth.ts | Session/principal/Bearer/role/center |
| Tạo | src/backend/src/cli.ts | Check/migrate/seed/credential local |
| Tạo | src/backend/src/credentials.ts | Async scrypt và private credential setup |
| Tạo | src/backend/src/db.ts | Pool/preflight/transaction/release |
| Tạo | src/backend/src/errors.ts | Envelope và mapping lỗi an toàn |
| Tạo | src/backend/src/foundation.ts | Kiểm startup trước listen |
| Tạo | src/backend/src/migrate.ts | Version/checksum/transaction/advisory lock |
| Tạo | src/backend/src/reference-config.ts | Validate/deep freeze/compatibility |
| Tạo | src/backend/src/runtime-config.ts | DB/port/path/AUTH từ env, giới hạn đúng DB |
| Tạo | src/backend/src/seed.ts | Fixture v1 tái lập, không ghi đè lịch sử |
| Tạo | src/backend/src/validation.ts | Object/whitelist/Unicode/query/ID/pagination |
| Tạo | src/backend/src/repositories/reference.repository.ts | SQL đọc ID tham chiếu, tách khỏi config policy |
| Tạo | src/backend/tests/helpers.ts | Identity ngẫu nhiên và HTTP server test |
| Tạo | src/backend/tests/http.test.ts | 7 HTTP integration test |
| Tạo | src/backend/tests/postgres.test.ts | 14 PostgreSQL subtest cách ly |
| Tạo | src/backend/tests/unit.test.ts | 22 unit test |
| Tạo | docs/progress/backend/phase-02.md | Báo cáo nghiệm thu lượt hiện tại |
| Xóa | src/backend/src/data/store.ts | Xóa mảng lưu trữ nghiệp vụ thử nghiệm |
| Xóa | src/backend/src/routes/customers.routes.ts | Xóa router sai contract, không thay bằng E01–E04 trước Phase 3 |

**Tổng:**6 tệp cũ sửa,25 tệp mới (có .env local và báo cáo này),2 tệp thử nghiệm xóa. Ngoài inventory công khai có2 tệp sinh local bị ignore: src/backend/.private/credentials.json và src/backend/.private/demo-passwords.local.json; chỉ ghi đường dẫn, không ghi nội dung. node_modules/dist là artifact dependency/build bị ignore.

So SHA-256 với57 tệp trước sửa:49 tệp cũ còn lại giữ nguyên, gồm docs/schema.sql, API gốc/phụ lục, SRS, ERD/DBML, AGENTS/kế hoạch, báo cáo Phase 1 và Frontend hiện có. Không thao tác ghi lên tài liệu nguồn/PDF trong Project. Không dùng Git để lập danh sách hay so sánh.

## D. Kiến trúc hiện thực

HTTP app→auth/service functions; PostgreSQL utility/repository cho truy vấn startup, migration và seed. app.ts không SQL, không listen. auth.ts nhận dependency config/credential/clock, không account repository giả; repository/reference đọc ID, config policy kiểm chúng. Chưa cần customer/device/ticket service khi chưa được giao E01–E13.

withTransaction lấy một client, BEGIN→callback→COMMIT hoặc ROLLBACK→release; rollback lỗi giữ lỗi gốc và hủy client không an toàn. Migration runner giữ advisory lock theo database/schema, transaction từng migration và registry cùng commit. Seed dùng advisory transaction lock riêng và không thay snapshot lịch sử.

Node24 chạy TypeScript trực tiếp ở dev/test; build dùng tsc và rewrite import extension ra JS. Giữ TypeScript strict, npm và dependency có sẵn; chỉ thêm pg/@types/pg. Không thêm test framework, dùng node:test.

## E. Migration và dữ liệu PostgreSQL thật

**Môi trường đã kiểm:** Node.js24.18.0, npm12.1.0, TypeScript7.0.2, Express5.3.0, pg8.23.1, @types/pg8.23.1, PostgreSQL18.6/UTF8 trên Windows.

Chỉ kết nối database local **mekong-mobile-l2**. Tài khoản do sinh viên cấp được kiểm trước migration: CONNECT database, USAGE/CREATE schema đang dùng và CREATE schema test đều có. Preflight lần đầu schema public rỗng. Không chỉnh quyền hoặc database khác; không CREATE/DROP/reset database.

| Lệnh đã chạy tại src/backend | Kết quả thực tế |
| --- | --- |
| npm run db:check | PASS — đúng database/UTF8/quyền, không in credentials |
| npm run db:migrate, lần đầu | PASS — applied_versions=[1,2] |
| npm run db:migrate, lần hai | PASS — applied_versions=[] |
| npm run db:seed, lần đầu | PASS — tickets_created=200 |
| npm run db:seed, lần hai | PASS — tickets_created=0, số bản ghi không đổi |

Migration001 giữ sáu CREATE TABLE của snapshot DDL, không BEGIN/COMMIT lồng runner. Migration002 tạo năm index và ticket_code_seq bắt đầu1000000/max999999999999. schema_migration chỉ version/name/checksum/applied_at; checksum SHA-256 nội dung SQL chuẩn hóa LF, không reference_config_version/fingerprint. DDL docs/schema.sql không cần sửa sau khi kiểm PostgreSQL thật.

| Bảng nghiệp vụ | Số bản ghi public sau kiểm cuối |
| --- | --- |
| customer |30|
| device |30|
| issue_category |6|
| ticket |200|
| ticket_status_log |200|
| ticket_communication |30|

Config không chứa business data mutable:2 center,4 product gồm0/120 tháng và inactive,5 account/membership gồm2 NV/2 QL/1 inactive. Không bảng product/center/employee/account/session/token. Seed mô phỏng v1, không nhận là CSV thật, thời điểm cố định2026-09-28; có4 tổ hợp warranty/approval, tombstone và actor lịch sử inactive.

Seed bảo toàn sửa tên/địa chỉ/ngày mua/deleted_at/approval/snapshot/history; xung đột natural key khác owner/product/quan hệ hoặc thiếu initial log thì rollback, không tự chữa. Test đã chèn một phiếu vận hành bằng sequence xen giữa các lần seed và xác nhận không bị ghi đè. Các thay đổi probe này chỉ trong schema test, public vẫn200 phiếu.

## F. Authentication và authorization

Login đúng [phụ lục](../../api-contract-l2-extension.md): username/password whitelist, username trim/case-sensitive, password không trim/normalize,200 data.access_token/token_type/expires_in/expires_at/principal và no-store; cùng401 khi sai tên/password/inactive. Lỗi input400/media415; cap503; không thêm E14 hoặc account API.

Credential private dùng scrypt N32768/r8/p1/keylen64/maxmem64MiB, salt16 byte ngẫu nhiên, timingSafeEqual; validate ID/hash/salt/tham số trước startup. Script setup tạo secret local ngẫu nhiên, không plaintext trong source hoặc log. Không dùng SHA-256 để băm password.

Bearer random32 byte base64url; Map chỉ digest SHA-256/employee ID/expiry. DefaultTTL3600 giây/cap100; cap runtime1–100, dọn login/lookup/mỗi60 giây, hết hạn tại now>=expiry. Kiểm cap sau await KDF và không await giữa kiểm cap/Map.set. Restart mất Map; account không còn active thì token không dùng được. Cleanup timer unref và bị dọn khi shutdown.

Principal từ accounts config server; NV active center, QL allowed centers. requireRole tách khỏi kiểm scope; không cấp QL quyền ghi CRUD. Giả role/center header không đổi quyền. 401/403/404 được HTTP harness kiểm thật; route giả chỉ trong tests. Body/query lỗi, PG error mapping và generic errors không trả SQL/detail/stack/private secret.

## G. Kiểm thử và minh chứng thực tế

Mọi lệnh dưới đây đã chạy. Kết quả ở lượt kiểm cuối sau thay đổi code:

| Lệnh / phép kiểm | Kết quả | Số lượng / nội dung |
| --- | --- | --- |
| npm ci | PASS | Cài lại đúng lockfile trong Backend; không đổi stack/nâng dependency có sẵn |
| npm run typecheck | PASS | tsc --noEmit, strict |
| npm run build | PASS | tsc -p tsconfig.build.json |
| npm test | PASS |29 test:22 unit +7 HTTP,0 fail/skip |
| npm run test:db | PASS |14 PostgreSQL subtest +1 test cha, runner báo15 PASS,0 fail/skip |
| Smoke bản build dist/server.js | PASS | startServer thực, cổng3001, HTTP login200/actor11, close server/session/pool thành công |
| Hash/phạm vi và secret scan | PASS |49 tệp cũ ngoài thay đổi giữ nguyên; không secret private/DB password hoặc URL xác thực trong nguồn/tài liệu; .env/.private có ignore, example placeholder |

Unit bao gồm valid/invalid config, ID/username trùng, membership/role/months/active center, whitelist/Unicode/ID/query lặp, error mapping, scrypt, token TTL đúng biên/restart, cap/cleanup/login đồng thời, principal inactive, role/center và transaction/release/rollback lỗi. HTTP gồm success/error envelope, no-store, inactive, malformed JSON/field/query/media/charset, Bearer401/role403/scope404, TTL và cap503.

PostgreSQL subtest: migration sạch/lặp/checksum/runner đồng thời/lỗi rollback; sáu bảng+registry; seed hai lần/counts/không ghi đè chỉnh sửa; UNIQUE kể cả tombstone/FK/CHECK/default; Unicode2000/2001/trắng; metadata/warranty matrix; transaction cùng PID/commit/rollback ticket+log; sequence/phiếu xen giữa; ID lịch sử; seed xung đột rollback; foundation từ chối config lỗi/thiếu reference trước listen.

Các test DB tự tạo schema phase2_test_<random> trong duy nhất database được cấp, không phụ thuộc số lần public đã seed. Chỉ dọn schema do chính lần test tạo thành công, không public/database. Kiểm cuối không còn schema test; public giữ số lượng tại Mục E.

Lượt HTTP/DB đầu trong sandbox bị EACCES loopback, không phải thiếu quyền PostgreSQL. Các lệnh local-network theo phạm vi được auto-review chấp thuận và chạy lại thành công; không cần Full access hoặc GRANT. Lượt cuối không còn FAIL/BLOCKED. Không coi lần thử bị môi trường chặn là test PASS.

**NOT RUN / ngoài Phase2:** nghiệp vụ E01–E13/bốn CRUD, thuật toán service warranty/SLA, concurrency approval thật, UI/NFR01/NFR03 và Docker toàn hệ thống. Fixture/SQL probe không được dùng để tuyên bố các chức năng đó đã hiện thực. **NOT APPLICABLE:** lint riêng vì dự án chưa có cấu hình lint; không bịa script lint.

## H. Thay đổi so với thiết kế Phase 1

Không thay quy tắc nghiệp vụ, API, schema snapshot hoặc phạm vi8 FR/US. Node test runner, pg, module reference repository và schema test cách ly là chi tiết TECH trong ủy quyền; không thêm abstraction phụ trợ/metadata fingerprint. Credential demo có file local private để người chạy nhập password, không hardcode source.

Đã ghi P2-DB..P2-SCOPE tại [decision log, Mục7](decision-log.md) và [TD-12](../../thay-doi-thiet-ke.md). Các sai lệch UC/ERD/SRS gốc đã ghi từ Phase1 vẫn là tác vụ đồng bộ hồ sơ riêng; không tự sửa tài liệu đã nộp.

## I. Giới hạn và công việc chưa làm

Không còn blocker Phase2. Phiên bản/môi trường trên là phạm vi đã kiểm, không cam kết mọi cấu hình Windows/PostgreSQL khác. Chỉ Backend được tái lập; Frontend và NFR fullstack chưa kiểm.

DEP-A không có FK SQL tới config. ID/phiên bản/quy trình cập nhật có kiểm soát không tự phát hiện người tái dùng cùng ID trái quy trình; SQL trực tiếp có thể bỏ qua service. Giữ bản config cũ/entry inactive, không tự sửa lịch sử.

Session một process, restart cần đăng nhập lại; không refresh/revoke/account management. API nghiệp vụ và CRUD chưa đăng ký. PG error fallback chung sẽ cần được service phase sau ánh xạ thành mã lỗi riêng đúng contract khi có ngữ cảnh nghiệp vụ. Không báo BT2 CRUD hoàn thành hoặc FR/NFR nghiệp vụ đạt chỉ từ Foundation.

README có quy trình bốn bước và script thật; lệnh dev/start được cấu hình từ cùng startup đã smoke test. Smoke đã đóng server/pool, không để tiến trình nền chạy sau nghiệm thu. Không tự chuyển Phase3.

## J. Nội dung đề xuất khai báo AI

- **Công cụ:** OpenAI Codex.
- **Mục đích:** hỗ trợ đọc baseline, hiện thực Foundation/PostgreSQL/migration/seed/config/AUTH/validation/error/transaction, viết test và tài liệu.
- **Phạm vi:** các tệp tại Mục C; không chỉnh API/Frontend/SRS/ERD/nguồn hoặc tự triển khai nghiệp vụ phase sau.
- **Codex đã kiểm:** type-check/build, npm ci, DB quyền/migration/seed, unit/HTTP/PostgreSQL integration, startup/login/shutdown, hash và secret scan nêu ở trên.
- **Sinh viên cần tự kiểm chứng:** đọc source/DDL/contract, chạy lại README/test, thử login/quyền, giải thích snapshot/seed/transaction/session/config và ghi đúng kết quả mình thực hiện. Chưa có căn cứ nói sinh viên đã làm các bước này.

Chỉ đề xuất nội dung; không sửa docs/ai-disclosure.md hoặc khai thay việc sinh viên kiểm chứng.

## K. Checklist20 tiêu chí Phase2

| STT | Tiêu chí | Kết quả / căn cứ |
| --- | --- | --- |
|1| Backend khởi động | PASS — compiled startup/login/shutdown thật |
|2| TypeScript type-check | PASS — npm run typecheck |
|3| Kết nối PostgreSQL hợp lệ | PASS — đúng database18.6/UTF8, preflight quyền |
|4| Migration trên PostgreSQL thật | PASS — versions1/2 từ schema rỗng |
|5| Migration lặp không phá schema | PASS — applied_versions=[]; checksum/runner đồng thời test đạt |
|6| Sáu bảng + tối đa một bảng migration | PASS — pg_tables có đúng7 bảng trong schema |
|7| Config DEP-A validation | PASS — type/ID/username/membership/role/months/deep freeze/reference |
|8| Seed lặp không nhân đôi | PASS — public hai lần và DB integration không đè vận hành |
|9| Không mảng thử nghiệm làm kho chính | PASS — xóa store/router mẫu, PostgreSQL lưu nghiệp vụ |
|10| HTTP login đúng phụ lục | PASS —7 HTTP test và smoke credential local |
|11| Bearer/session hoạt động | PASS — random/TTL/restart/cap/cleanup/inactive |
|12| Middleware role/center kiểm thử | PASS — harness HTTP401/403/404, không public route test |
|13| Error handling thống nhất | PASS — envelope/JSON/media/PG mapping, không raw error |
|14| Transaction và rollback | PASS — unit + PostgreSQL thật, một client/release/rollback lỗi |
|15| Unit/integration nền tảng đạt | PASS —29 unit/HTTP,14 DB subtest;0 fail/skip |
|16| README tái lập | PASS — npm ci/check/migrate/seed/build/test/startup theo script thật; chỉ Backend |
|17| Không sửa Frontend/contract/nguồn | PASS — hash tệp repo ngoài phạm vi và chỉ đọc nguồn Project |
|18| Không bảng/module/endpoint vượt phạm vi | PASS —6+1 bảng, login duy nhất, E01–E13/CRUD chưa public |
|19| Báo cáo có minh chứng | PASS — lệnh, môi trường, counts, số test và giới hạn tại E/G |
|20| Thay đổi/AI được ghi nhận | PASS — Mục C/H/J, decision log P2 và TD-12 |

## L. Kết luận

**PHASE 2 — HOÀN THÀNH.** Đạt20/20 tiêu chí trong phạm vi Backend Foundation với PostgreSQL thật. Không còn blocker của giai đoạn này; source/config/test và dữ liệu demo đã sẵn sàng để sinh viên review.

Đã dừng sau Phase2. Phase3 chỉ bắt đầu khi sinh viên giao riêng; không suy từ việc nghiệm thu Foundation thành quyền hiện thực Customer/Device hoặc CRUD.
