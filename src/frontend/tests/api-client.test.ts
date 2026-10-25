import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import * as dto from "../src/lib/contracts.ts";
import { createApiClient, ApiError } from "../src/lib/api-client.ts";
import { homePath, returnPath, ticketIdFromPath } from "../src/lib/navigation.ts";
import { validateLogin } from "../src/lib/login-validation.ts";
import { customerFields, deviceFields, hasFieldErrors, normalizeIntakePhone, serialIssue } from "../src/lib/intake-validation.ts";
import { ticketFields, ticketPriority, ticketServerFields, uncertainTicketWrite } from "../src/lib/ticket-validation.ts";
import { formatTimestamp } from "../src/lib/date-time.ts";

// Các key/nullability lấy từ response mẫu API v0.1 E01/E08/E10, không phải mock production.
const customer = { customer_id: 1024, full_name: "Nguyễn Văn Minh", phone: "085****105", address: null, created_at: "2026-09-01T10:00:00+07:00" };
const ticket = { ticket_id: 88232, ticket_code: "BH-000232/2026", customer_id: 1024, device_id: 3312, center_id: 2, issue_desc: "Máy không nhận sạc", category_id: 3, priority: "CAO", status: "MOI", received_at: "2026-09-28T09:00:00+07:00", due_date: "2026-09-29T09:00:00+07:00", assessed_on: "2026-09-28", purchase_date_snapshot: null, warranty_months_snapshot: 12, warranty_expires_on: null, warranty_status: "CHUA_XAC_MINH", approval_status: "CHO_PHE_DUYET", approved_by: null, approved_at: null, approval_note: null, can_proceed: false };
const session = () => ({ access_token: randomBytes(32).toString("base64url"), token_type: "Bearer", expires_in: 3600, expires_at: "2026-09-28T10:00:00+07:00", principal: { employee_id: 11, role: "NHAN_VIEN_TIEP_NHAN", active_center_id: 2, allowed_center_ids: [2] } });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

test("F-U35 timestamp hiển thị dd/MM/yyyy HH:mm tại Việt Nam, giữ đúng biên00:00", () => {
  assert.equal(formatTimestamp("2026-10-06T00:00:00.000+07:00"), "06/10/2026 00:00");
  assert.equal(formatTimestamp("2026-10-05T17:00:00.000Z"), "06/10/2026 00:00");
  assert.equal(formatTimestamp("2026-09-29T09:00:00.000+07:00"), "29/09/2026 09:00");
});

test("F-U30 mô tả lỗi1/2000/2001 code point, trim nhưng không normalize Unicode", () => {
  const categories = [{ category_id: 3, category_name: "Sạc" }];
  for (const issue of ["x", " 😀 ", "😀".repeat(2000), "a\u0301".repeat(1000)]) assert.equal(ticketFields(issue, "3", "CAO", categories).issue_desc, undefined);
  for (const issue of ["", " \t\n\u00a0 ", "😀".repeat(2001), "a\u0301".repeat(1000) + "a"]) assert.ok(ticketFields(issue, "3", "CAO", categories).issue_desc);
});

test("F-U31 mô tả từ chối NUL/surrogate lẻ, không chặn cặp surrogate hợp lệ", () => {
  for (const issue of ["x\0", "x\ud800", "\udc00x"]) assert.ok(ticketFields(issue, "3", "CAO", [{ category_id: 3, category_name: "Sạc" }]).issue_desc);
  assert.equal(ticketFields("😀", "3", "CAO", [{ category_id: 3, category_name: "Sạc" }]).issue_desc, undefined);
});

test("F-U32 không default nhóm/ưu tiên, category phải thuộc danh mục đang đọc", () => {
  const values = [{ category_id: 3, category_name: "Sạc" }];
  for (const category of ["", "0", "03", "4", "NaN"]) assert.ok(ticketFields("x", category, "CAO", values).category_id);
  assert.ok(ticketFields("x", "3", "CAO", []).category_id);
  for (const priority of ["", "cao", "UNKNOWN"]) { assert.equal(ticketPriority(priority), null); assert.ok(ticketFields("x", "3", priority, values).priority); }
  for (const priority of ["CAO", "TRUNG_BINH", "THAP"]) assert.equal(ticketPriority(priority), priority);
  assert.deepEqual(ticketServerFields(new ApiError(400, "VALIDATION_FAILED", "Lỗi", { issue_desc: "Sai mô tả", category_id: "Nhóm ngừng", center_id: "Nội bộ" })), { issue_desc: "Sai mô tả", category_id: "Nhóm ngừng" });
});

test("F-U33 E07 không gửi ngày máy; E08 chỉ6 field, giữ kết quả/snapshot server", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const result = { ...ticket, assessed_on: "2026-10-04", warranty_status: "HET_BAO_HANH", approval_status: "KHONG_CAN", can_proceed: true, purchase_date_snapshot: "2025-10-03", warranty_expires_on: "2026-10-03" };
  const api = createApiClient({ baseUrl: "http://example.test/api", transport: async (url, init) => {
    calls.push({ url: String(url), init });
    return response({ data: calls.length === 1 ? { device_id: 3312, assessed_on: "2026-10-03", purchase_date: "2025-10-03", warranty_months: 12, warranty_expires_on: "2026-10-03", warranty_status: "CON_BAO_HANH", requires_approval: false } : result }, calls.length === 1 ? 200 : 201);
  } });
  await api.warranty(3312);
  const body = { customer_id: 1024, device_id: 3312, center_id: 2, issue_desc: "x", category_id: 3, priority: "CAO" as const };
  assert.deepEqual(await api.createTicket(body), result);
  assert.equal(calls[0].url, "http://example.test/api/devices/3312/warranty");
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), body);
});

test("F-U34 kết quả ghi chưa xác định: mạng/5xx/DTO không được coi là chưa commit", () => {
  for (const error of [new ApiError(0, "NETWORK_ERROR", "Mạng"), new ApiError(503, "UNAVAILABLE", "Lỗi"), new dto.ContractError()]) assert.equal(uncertainTicketWrite(error), true);
  for (const status of [400, 401, 403, 404, 409]) assert.equal(uncertainTicketWrite(new ApiError(status, "REJECTED", "Lỗi")), false);
  assert.equal(uncertainTicketWrite(new ApiError(0, "STALE_REQUEST", "Phiên cũ")), false);
});

test("F-U01 E01 customer_id/address null đúng contract, tên field id cũ bị từ chối", () => {
  assert.deepEqual(dto.customer(customer), customer);
  const rest: Record<string, unknown> = { ...customer }; delete rest.customer_id;
  assert.throws(() => dto.customer({ ...rest, id: 1024 }), dto.ContractError);
  assert.throws(() => dto.customer({ ...customer, address: undefined }), dto.ContractError);
});
test("F-U02 Device DATE/null và numeric ID không tự đoán kiểu", () => {
  const input = { device_id: 1, customer_id: 2, product_id: 101, serial_no: "001", purchase_date: null, warranty_months: 0 };
  assert.deepEqual(dto.device(input), input);
  for (const input of [{ device_id: "1" }, { warranty_months: 121 }, { purchase_date: "2026-01-01T00:00:00Z" }]) assert.throws(() => dto.device({ ...{ device_id: 1, customer_id: 2, product_id: 101, serial_no: "001", purchase_date: null, warranty_months: 0 }, ...input }), dto.ContractError);
});
test("F-U03 E08/E10 giữ snapshot NULL, nested DTO, can_proceed và offset", () => {
  const input = { ...ticket, customer: { customer_id: 1024, full_name: customer.full_name, phone: customer.phone }, device: { device_id: 3312, serial_no: "356938035643810", product_id: 101 } };
  assert.deepEqual(dto.detail(input), input);
  for (const patch of [{ approved_by: undefined }, { can_proceed: "false" }, { due_date: "2026-09-29T02:00:00Z" }, { warranty_status: "UNKNOWN" }]) assert.throws(() => dto.detail({ ...input, ...patch }), dto.ContractError);
});
test("F-U04 page/meta từ response thật, empty/out-of-page và ID unsafe bị chặn", () => {
  assert.deepEqual(dto.page({ data: [], meta: { page: 99, size: 20, total: 0 } }, dto.summary), { data: [], meta: { page: 99, size: 20, total: 0 } });
  assert.throws(() => dto.page({ data: [], meta: { page: 1, size: 20, total: "0" } }, dto.summary), dto.ContractError);
  assert.throws(() => dto.ticket({ ...ticket, ticket_id: 9007199254740992 }), dto.ContractError);
});
test("F-U05 login kiểm principal/role/Bearer, không dùng quyền client tự đặt", () => {
  const signed = session(); assert.deepEqual(dto.login(signed), signed);
  assert.throws(() => dto.login({ ...signed, principal: { ...signed.principal, role: "ADMIN" } }), dto.ContractError);
  assert.throws(() => dto.login({ ...signed, access_token: "fixed" }), dto.ContractError);
});
test("F-U06 request tập trung base URL/Bearer/JSON/cache; token chỉ trong memory", async () => {
  const signed = session(), calls: { url: string; init?: RequestInit }[] = [];
  const transport: typeof fetch = async (input, init) => { calls.push({ url: String(input), init }); return calls.length === 1 ? response({ data: signed }) : response({ data: customer }); };
  const api = createApiClient({ baseUrl: "http://example.test/api/", transport });
  await api.login("input_user", "input_password"); await api.customer("+84 854.141.105");
  assert.equal(calls[0]!.url, "http://example.test/api/auth/login"); assert.equal(new Headers(calls[0]!.init?.headers).get("authorization"), null);
  assert.equal(new Headers(calls[1]!.init?.headers).get("authorization"), "Bearer " + signed.access_token);
  assert.equal(calls[1]!.init?.cache, "no-store"); assert.ok(calls[1]!.url.includes("%2B84"));
});
test("F-U07 error409/fields/existing_customer mask được giữ để chọn hồ sơ", async () => {
  const api = createApiClient({ baseUrl: "/api", transport: async () => response({ error: { code: "PHONE_ALREADY_EXISTS", message: "Đã có hồ sơ", fields: { phone: "Trùng" }, existing_customer: customer } }, 409) });
  await assert.rejects(api.createCustomer({ full_name: "X", phone: "0854141105" }), (e: unknown) => e instanceof ApiError && e.status === 409 && e.existingCustomer?.phone === "085****105" && e.fields.phone === "Trùng");
});
test("F-U08 role403/resource404 trả mã ổn định, không tự logout", async () => {
  for (const status of [403, 404]) { let notified = false;
    const api = createApiClient({ baseUrl: "/api", onUnauthorized: () => { notified = true; }, transport: async () => response({ error: { code: "DENIED", message: "Không được phép", fields: {} } }, status) });
    await assert.rejects(api.detail(1), (e: unknown) => e instanceof ApiError && e.status === status); assert.equal(notified, false);
  }
});
test("F-U09 HTTP401 xóa token/notify và request kế tiếp không Bearer", async () => {
  let notified = 0; const headers: Headers[] = [];
  const api = createApiClient({ baseUrl: "/api", onUnauthorized: () => { notified++; }, transport: async (_input, init) => { headers.push(new Headers(init?.headers)); return response({ error: { code: "AUTHENTICATION_REQUIRED", message: "Cần đăng nhập", fields: {} } }, 401); } });
  api.setToken(randomBytes(32).toString("base64url")); await assert.rejects(api.detail(1)); await assert.rejects(api.detail(1));
  assert.ok(headers[0]!.has("authorization")); assert.equal(headers[1]!.has("authorization"), false); assert.equal(notified, 2);
});
test("F-U10 network/timeout và500 không phơi SQL/secret", async () => {
  const offline = createApiClient({ baseUrl: "/api", transport: async () => { throw new TypeError("private connection detail"); } });
  await assert.rejects(offline.detail(1), (e: unknown) => e instanceof ApiError && e.code === "NETWORK_ERROR" && !e.message.includes("private"));
  const fault = createApiClient({ baseUrl: "/api", transport: async () => response({ error: { code: "INTERNAL_ERROR", message: "raw SQL private detail", fields: {} } }, 500) });
  await assert.rejects(fault.detail(1), (e: unknown) => e instanceof ApiError && !e.message.includes("SQL"));
});
test("F-U11 response đổi shape hoặc JSON hỏng bị ContractError thay vì đoán field", async () => {
  for (const transport of [async () => response({ customers: [customer] }), async () => new Response("invalid JSON", { status: 200 })]) {
    const api = createApiClient({ baseUrl: "/api", transport }); await assert.rejects(api.customer("0854141105"), dto.ContractError);
  }
});
test("F-U12 catalog/warranty/communication và approval nullable đúng contract", () => {
  assert.equal(dto.product({ product_id: 101, product_name: "Mẫu", warranty_months: 120 }).warranty_months, 120);
  assert.equal(dto.category({ category_id: 3, category_name: "Sạc" }).category_name, "Sạc");
  const w = { device_id: 3312, assessed_on: "2026-09-28", purchase_date: null, warranty_months: 12, warranty_expires_on: null, warranty_status: "CHUA_XAC_MINH", requires_approval: true };
  assert.deepEqual(dto.warranty(w), w); assert.throws(() => dto.warranty({ ...w, warranty_expires_on: undefined }), dto.ContractError);
  assert.equal(dto.approval({ ...ticket, approval_status: "DA_PHE_DUYET", approved_by: 21, approved_at: "2026-09-28T10:00:00+07:00", can_proceed: true }).approved_by, 21);
  assert.equal(dto.communication({ communication_id: 1, ticket_id: 3312, content: "😀", created_at: "2026-09-28T10:00:00+07:00", created_by: 11 }).content, "😀");
});

test("F-U13 login401 là lỗi credential, không gửi token cũ hoặc báo hết phiên", async () => {
  let notified = 0;
  let authorization: string | null = null;
  const api = createApiClient({ baseUrl: "/api", onUnauthorized: () => { notified++; }, transport: async (_input, init) => {
    authorization = new Headers(init?.headers).get("authorization");
    return response({ error: { code: "INVALID_CREDENTIALS", message: "Thông tin đăng nhập không hợp lệ", fields: {} } }, 401);
  } });
  api.setToken(session().access_token);
  await assert.rejects(api.login("wrong", "wrong"), (error: unknown) => error instanceof ApiError && error.code === "INVALID_CREDENTIALS");
  assert.equal(authorization, null);
  assert.equal(notified, 0);
});

test("F-U14 response401 phiên cũ không được xóa token của phiên mới", async () => {
  const pending = Promise.withResolvers<Response>();
  const headers: Headers[] = [];
  let notified = 0;
  const api = createApiClient({ baseUrl: "/api", onUnauthorized: () => { notified++; }, transport: async (_input, init) => {
    headers.push(new Headers(init?.headers));
    return headers.length === 1 ? pending.promise : response({ data: customer });
  } });
  api.setToken(session().access_token);
  const oldRequest = api.detail(1);
  const nextToken = session().access_token;
  api.setToken(nextToken);
  const rejected = assert.rejects(oldRequest, (error: unknown) => error instanceof ApiError && error.code === "STALE_REQUEST");
  pending.resolve(response({ error: { code: "AUTHENTICATION_REQUIRED", message: "Cần đăng nhập", fields: {} } }, 401));
  await rejected;
  await api.customer("0854141105");
  assert.equal(notified, 0);
  assert.equal(headers[1].get("authorization"), "Bearer " + nextToken);
});

test("F-U15 kết quả hồ sơ phiên cũ không được đưa vào phiên mới", async () => {
  const pending = Promise.withResolvers<Response>();
  const api = createApiClient({ baseUrl: "/api", transport: async () => pending.promise });
  api.setToken(session().access_token);
  const oldRequest = api.customer("0854141105");
  api.setToken(null);
  const rejected = assert.rejects(oldRequest, (error: unknown) => error instanceof ApiError && error.code === "STALE_REQUEST");
  pending.resolve(response({ data: customer }));
  await rejected;
});

test("F-U16 login hoàn tất sau logout không được phục hồi token", async () => {
  const pending = Promise.withResolvers<Response>();
  const headers: Headers[] = [];
  const api = createApiClient({ baseUrl: "/api", transport: async (_input, init) => {
    headers.push(new Headers(init?.headers));
    return headers.length === 1 ? pending.promise : response({ data: customer });
  } });
  const login = api.login("user", "password");
  api.setToken(null);
  const rejected = assert.rejects(login, (error: unknown) => error instanceof ApiError && error.code === "STALE_REQUEST");
  pending.resolve(response({ data: session() }));
  await rejected;
  await api.customer("0854141105");
  assert.equal(headers[1].has("authorization"), false);
});

test("F-U17 đổi phiên trong lúc đọc body cũng không được nhận dữ liệu cũ", async () => {
  const reading = Promise.withResolvers<void>();
  const body = Promise.withResolvers<unknown>();
  class DelayedBody extends Response {
    override async json(): Promise<unknown> { reading.resolve(); return body.promise; }
  }
  const api = createApiClient({ baseUrl: "/api", transport: async () => new DelayedBody() });
  const pending = api.customer("0854141105");
  const rejected = assert.rejects(pending, (error: unknown) => error instanceof ApiError && error.code === "STALE_REQUEST");
  await reading.promise;
  api.setToken(session().access_token);
  body.resolve({ data: customer });
  await rejected;
});

test("F-U18 return path chỉ nhận route nội bộ đúng vai trò và ID an toàn", () => {
  const employee = "NHAN_VIEN_TIEP_NHAN", manager = "QUAN_LY_TTBH";
  assert.equal(homePath(employee), "/intake");
  assert.equal(homePath(manager), "/tickets");
  assert.equal(returnPath("/intake", manager), "/tickets");
  assert.equal(returnPath("/tickets/123", employee), "/tickets/123");
  for (const path of [null, "https://outside.test", "//outside.test", "/tickets?token=private", "/tickets/BH-000123/2026", "/tickets/9007199254740992"]) {
    assert.equal(returnPath(path, employee), "/intake");
  }
  for (const id of ["0", "-1", "1.5", "1e3", "NaN", "9007199254740992"]) assert.equal(ticketIdFromPath(id), null);
  assert.equal(ticketIdFromPath("123"), 123);
});

test("F-U19 login kiểm username sau trim, giữ case và không normalize Unicode", () => {
  assert.deepEqual(validateLogin(" \uFEFFNv_Demo_A\u00a0 ", "valid"), { username: "Nv_Demo_A", fields: {} });
  assert.equal(validateLogin("e\u0301", "valid").username, "e\u0301");
  assert.ok(validateLogin(" \t\n\uFEFF", "valid").fields.username);
  assert.deepEqual(validateLogin("😀".repeat(64), "valid").fields, {});
  assert.ok(validateLogin("😀".repeat(65), "valid").fields.username);
  assert.deepEqual(validateLogin("e\u0301".repeat(32), "valid").fields, {});
  assert.ok(validateLogin("e\u0301".repeat(32) + "x", "valid").fields.username);
});

test("F-U20 password rỗng bị chặn; khoảng trắng là dữ liệu hợp lệ theo A01", () => {
  assert.ok(validateLogin("nv", "").fields.password);
  for (const password of [" ", "\t", " password ", "\u00a0", "e\u0301"]) {
    assert.deepEqual(validateLogin("nv", password).fields, {});
  }
});

test("F-U21 giới hạn password256 tính theo code point, không theo UTF16/grapheme", () => {
  assert.deepEqual(validateLogin("nv", "😀".repeat(256)).fields, {});
  assert.ok(validateLogin("nv", "😀".repeat(257)).fields.password);
  assert.deepEqual(validateLogin("nv", "e\u0301".repeat(128)).fields, {});
  assert.ok(validateLogin("nv", "e\u0301".repeat(128) + "x").fields.password);
});

test("F-U22 login từ chối NUL/surrogate không ghép ở cả hai field", () => {
  for (const invalid of ["a\0", "\ud800", "\udc00", "a\ud800b"]) {
    assert.ok(validateLogin(invalid, "valid").fields.username);
    assert.ok(validateLogin("nv", invalid).fields.password);
  }
  assert.deepEqual(validateLogin("nv", "\ud83d\ude00").fields, {});
});

test("F-U23 E03 chuyển serial exact/page/size, giữ số0/case và encode dấu+", async () => {
  let url = "";
  const api = createApiClient({ baseUrl: "/api", transport: async input => { url = String(input); return response({ data: [], meta: { page: 3, size: 7, total: 18 } }); } });
  const serial = "00a+ A./😀";
  const result = await api.devices(1024, { serial_no: serial, page: 3, size: 7 });
  const query = new URL(url, "http://test.local").searchParams;
  assert.equal(query.get("serial_no"), serial);
  assert.equal(query.get("page"), "3"); assert.equal(query.get("size"), "7");
  assert.equal(result.meta.total, 18); assert.equal(result.data.length, 0);
});

test("F-U24 E05 phân trang theo server, không coi size100 là toàn danh mục", async () => {
  let url = "";
  const api = createApiClient({ baseUrl: "/api", transport: async input => { url = String(input); return response({ data: [{ product_id: 1101, product_name: "Cuối danh mục", warranty_months: 10 }], meta: { page: 6, size: 20, total: 101 } }); } });
  const result = await api.products({ page: 6, size: 20 });
  assert.equal(new URL(url, "http://test.local").searchParams.get("page"), "6");
  assert.equal(result.data[0].product_id, 1101); assert.equal(result.meta.total, 101);
});

test("F-U25 lỗi SERIAL_ALREADY_EXISTS giữ existing_device đã decode đúng DTO", async () => {
  const existing = { device_id: 1, customer_id: 1024, product_id: 101, serial_no: "00a", purchase_date: null, warranty_months: 12 };
  const api = createApiClient({ baseUrl: "/api", transport: async () => response({ error: { code: "SERIAL_ALREADY_EXISTS", message: "Đã có", fields: {}, existing_device: existing } }, 409) });
  await assert.rejects(api.createDevice(1024, { product_id: 101, serial_no: "00a", purchase_date: null }), (error: unknown) => error instanceof ApiError && error.existingDevice?.customer_id === 1024 && error.existingDevice.serial_no === "00a");
});

test("F-U26 không nhận existing_device ở lỗi khác chủ; DTO sai không được đoán", async () => {
  const existing = { device_id: "1", customer_id: 9 };
  for (const code of ["DEVICE_OWNER_MISMATCH", "SERIAL_ALREADY_EXISTS"]) {
    const api = createApiClient({ baseUrl: "/api", transport: async () => response({ error: { code, message: "Xung đột", fields: {}, existing_device: existing } }, 409) });
    await assert.rejects(api.createDevice(1, { product_id: 101, serial_no: "a", purchase_date: null }), (error: unknown) => code === "DEVICE_OWNER_MISMATCH" ? error instanceof ApiError && error.existingDevice === undefined : error instanceof dto.ContractError);
  }
});

test("F-U27 phone UX cùng quy ước QT02/E01, kiểm raw1–30 trước chuẩn hóa", () => {
  for (const phone of ["0854141105", "+84 854.141.105", "84854141105", "0854 141 105"]) assert.equal(normalizeIntakePhone(phone), "0854141105");
  assert.equal(normalizeIntakePhone(" ".repeat(20) + "0854141105"), "0854141105");
  for (const phone of ["", "085****105", "0854\t141105", "085414110", " ".repeat(21) + "0854141105", "0854141105\0"]) assert.equal(normalizeIntakePhone(phone), null);
});

test("F-U28 tên/địa chỉ theo Unicode code point, rỗng/biên/NUL đều kiểm đúng", () => {
  assert.equal(hasFieldErrors(customerFields("😀".repeat(120), "0854141105", "😀".repeat(255))), false);
  assert.ok(customerFields("😀".repeat(121), "0854141105", "").full_name);
  assert.ok(customerFields(" \t", "0854141105", "").full_name);
  assert.ok(customerFields("Tên", "0854141105", "😀".repeat(256)).address);
  assert.ok(customerFields("Tên\0", "0854141105", "").full_name);
});

test("F-U29 serial chữ/số0/Unicode và ngày mua nullable/đúng lịch, không kiểm ngày máy", () => {
  assert.equal(serialIssue(" 00aBc "), undefined);
  assert.equal(serialIssue("😀".repeat(50)), undefined);
  assert.ok(serialIssue("😀".repeat(51))); assert.ok(serialIssue(" \t"));
  assert.ok(deviceFields(null, "00a", "").product_id);
  for (const date of ["", "2024-02-29", "2999-01-01"]) assert.equal(hasFieldErrors(deviceFields(101, "00a", date)), false);
  for (const date of ["2025-02-29", "2026-13-01", "0000-01-01", "2026-01-32"]) assert.ok(deviceFields(101, "00a", date).purchase_date);
});
