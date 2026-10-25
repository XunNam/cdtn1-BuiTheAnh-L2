import { test, before } from "node:test";
import assert from "node:assert/strict";
import type { Pool, PoolClient } from "pg";
import { normalizePhone, newCustomer, customerPatch, newDevice, devicePatch, localDate, purchaseDate } from "../src/customer-device.validation.ts";
import { customerDto, deviceDto, maskPhone, safeNumber } from "../src/customer-device.dto.ts";
import { AppError, publicError } from "../src/errors.ts";
import { createCustomerService } from "../src/services/customers.service.ts";
import { createDeviceService } from "../src/services/devices.service.ts";
import { customerRepository } from "../src/repositories/customers.repository.ts";
import { deviceRepository } from "../src/repositories/devices.repository.ts";
import type { CustomerRow } from "../src/repositories/customers.repository.ts";
import type { DeviceRow } from "../src/repositories/devices.repository.ts";
import type { Principal } from "../src/auth.ts";
import { validateReference } from "../src/reference-config.ts";
import { referenceInput } from "./helpers.ts";

const now = new Date("2026-10-24T09:00:00+07:00");
const nv: Principal = { employee_id: 11, role: "NHAN_VIEN_TIEP_NHAN", active_center_id: 1, allowed_center_ids: [1] };
const ql: Principal = { ...nv, role: "QUAN_LY_TTBH" };
const customer: CustomerRow = { customer_id: "1", center_id: "1", full_name: "Khách unit", phone: "0854141105", address: null, created_at: now, deleted_at: null };
const device: DeviceRow = { device_id: "1", customer_id: "1", product_id: "101", serial_no: "000a", purchase_date: null, warranty_months: 12, deleted_at: null };
let config: ReturnType<typeof validateReference>;
before(async () => { config = validateReference(await referenceInput()); });
function fakePool() {
  const calls: string[] = [];
  const client = { query: async (s: string) => { calls.push(s); return { rows: [] }; }, release: () => { calls.push("RELEASE"); } } as unknown as PoolClient;
  return { pool: { connect: async () => client } as Pool, calls };
}
const hasCode = (code: string) => (e: unknown) => e instanceof AppError && e.code === code;

test("P3-U01 QT-02: bốn định dạng phone về cùng giá trị, không đoán thuê bao", () => {
  for (const p of ["0854141105", "+84 854.141.105", "84854141105", "0854 141 105"]) assert.equal(normalizePhone(p), "0854141105");
  for (const p of ["", "854141105", "00854141105", "+1 854141105", "0854-141-105", "0854\t141105", "0abcdefghj", 854141105, " ".repeat(31) + "0854141105"])
    assert.throws(() => normalizePhone(p), hasCode("VALIDATION_FAILED"));
});
test("P3-U02 customer validation: tên1/120/121 code point, address bỏ/null/rỗng", () => {
  assert.equal(newCustomer({ full_name: " 😀 ", phone: "0854141105" }).full_name, "😀");
  assert.equal(newCustomer({ full_name: "a".repeat(120), phone: "0854141105" }).address, null);
  assert.equal(newCustomer({ full_name: "a", phone: "0854141105", address: "  " }).address, "");
  assert.equal(newCustomer({ full_name: "a", phone: "0854141105", address: null }).address, null);
  for (const body of [{ full_name: "a".repeat(121), phone: "0854141105" }, { full_name: " ", phone: "0854141105" },
    { full_name: "a", phone: "0854141105", address: "x".repeat(256) }, { full_name: "a" }, { full_name: "a", phone: "0854141105", center_id: 2 }])
    assert.throws(() => newCustomer(body), hasCode("VALIDATION_FAILED"));
});
test("P3-U03 PATCH whitelist và semantics bỏ field/null; không sửa trường chỉ đọc", () => {
  assert.deepEqual(customerPatch({ address: null }), { address: null });
  assert.deepEqual(customerPatch({ full_name: " X " }), { full_name: "X" });
  for (const field of ["customer_id", "phone", "center_id", "created_at", "deleted_at"]) assert.throws(() => customerPatch({ [field]: 1 }));
  for (const value of [{}, [], null, { full_name: null }]) assert.throws(() => customerPatch(value));
  for (const field of ["device_id", "customer_id", "product_id", "serial_no", "warranty_months", "deleted_at"])
    assert.throws(() => devicePatch({ purchase_date: null, [field]: 1 }, now));
  assert.throws(() => devicePatch({}, now));
});
test("P3-U04 ngày mua: null/năm nhuận/ngày sai/tương lai và biên local Asia/Ho_Chi_Minh", () => {
  assert.equal(purchaseDate(null, now), null);
  assert.equal(purchaseDate("2024-02-29", now), "2024-02-29");
  assert.equal(localDate(new Date("2026-10-23T17:00:00Z")), "2026-10-24");
  assert.equal(purchaseDate("2026-10-24", new Date("2026-10-23T17:00:00Z")), "2026-10-24");
  for (const date of ["2026-10-25", "2026-02-29", "2026-04-31", "2026-1-01", "0000-01-01", 1, "", " 2026-01-01 "])
    assert.throws(() => purchaseDate(date, now), hasCode("VALIDATION_FAILED"));
});
test("P3-U05 E04: serial chuỗi, thiếu ngày mua, product safe ID và field client bị cấm", () => {
  assert.deepEqual(newDevice({ product_id: 102, serial_no: " 000a " }, now), { product_id: 102, serial_no: "000a", purchase_date: null });
  for (const body of [{ product_id: "101", serial_no: "x" }, { product_id: 1.5, serial_no: "x" }, { product_id: 101, serial_no: "x".repeat(51) },
    { product_id: 101, serial_no: "x", warranty_months: 120 }, { product_id: 101, serial_no: 123 }, { product_id: 101, serial_no: "x", purchase_date: "2026-10-25" }])
    assert.throws(() => newDevice(body, now), hasCode("VALIDATION_FAILED"));
});
test("P3-U06 serializer exact field, phone masking/manager và safe BIGINT", () => {
  const dto = customerDto(customer, nv.role);
  assert.deepEqual(Object.keys(dto), ["customer_id", "full_name", "phone", "address", "created_at"]);
  assert.equal(dto.phone, "085****105"); assert.ok(dto.created_at.endsWith("+07:00"));
  assert.equal(maskPhone(customer.phone, ql.role), customer.phone);
  assert.deepEqual(Object.keys(deviceDto(device)), ["device_id", "customer_id", "product_id", "serial_no", "purchase_date", "warranty_months"]);
  assert.throws(() => safeNumber("9007199254740992"), hasCode("INTERNAL_ERROR"));
});
test("P3-U07 customer service scope SQL parameter và role gate trước repository", async () => {
  let called = 0;
  const repo = { ...customerRepository, findActiveByPhone: async (_db: unknown, phone: string, center: number) => {
    called++; assert.equal(center, 1); assert.equal(phone, customer.phone); return customer;
  }};
  const service = createCustomerService({} as Pool, () => now, repo);
  assert.equal((await service.lookup(nv, customer.phone)).phone, "085****105");
  await assert.rejects(service.lookup(ql, customer.phone), hasCode("ROLE_FORBIDDEN")); assert.equal(called, 1);
  const missing = createCustomerService({} as Pool, () => now, { ...repo, findActiveByPhone: async () => undefined });
  await assert.rejects(missing.lookup(nv, customer.phone), hasCode("CUSTOMER_NOT_FOUND"));
});
test("P3-U08 phone collision chỉ trả existing_customer đã mask trong scope", async () => {
  for (const visible of [true, false]) {
    const service = createCustomerService({} as Pool, () => now, { ...customerRepository,
      create: async () => { throw { code: "23505", constraint: "customer_phone_key", detail: "private detail" }; },
      findActiveByPhone: async () => visible ? customer : undefined,
    });
    await assert.rejects(service.create(nv, { full_name: "X", phone: customer.phone, address: null }), (e: unknown) => {
      assert.ok(e instanceof AppError); assert.equal(publicError(e).status, 409);
      assert.equal(Object.hasOwn(e.extras, "existing_customer"), visible);
      if (visible) assert.equal((e.extras.existing_customer as { phone: string }).phone, "085****105");
      assert.ok(!e.message.includes(customer.phone)); return true;
    });
  }
});
test("P3-U09 product lookup active, lấy đúng0/120 tháng và không truy vấn product SQL", async () => {
  for (const [id, months] of [[102, 0], [103, 120]]) {
    const { pool, calls } = fakePool();
    const service = createDeviceService(pool, config, () => now,
      { ...customerRepository, findById: async () => customer },
      { ...deviceRepository, create: async (_db: unknown, cid: number, input: unknown, storedMonths: number) => {
        assert.equal(cid, 1); assert.equal(storedMonths, months); return { ...device, product_id: String(id), warranty_months: storedMonths };
      }});
    assert.equal((await service.create(nv, 1, { product_id: id!, serial_no: "X", purchase_date: null })).warranty_months, months);
    assert.deepEqual(calls, ["BEGIN", "COMMIT", "RELEASE"]);
  }
  for (const id of [104, 999]) {
    const { pool, calls } = fakePool();
    const service = createDeviceService(pool, config, () => now, { ...customerRepository, findById: async () => customer });
    await assert.rejects(service.create(nv, 1, { product_id: id, serial_no: "X", purchase_date: null }), hasCode("PRODUCT_NOT_FOUND"));
    assert.deepEqual(calls, ["BEGIN", "ROLLBACK", "RELEASE"]);
  }
});
test("P3-U10 serial collision khác owner không lộ existing_device; tombstone không trả profile", async () => {
  for (const [owner, deleted] of [["2", false], ["1", true]] as const) {
    const { pool } = fakePool();
    const service = createDeviceService(pool, config, () => now, { ...customerRepository, findById: async () => customer },
      { ...deviceRepository, create: async () => { throw { code: "23505", constraint: "device_serial_no_key" }; },
        findBySerial: async () => ({ ...device, customer_id: owner!, deleted_at: deleted ? now : null, center_id: "1", customer_deleted_at: null }) });
    await assert.rejects(service.create(nv, 1, { product_id: 101, serial_no: "X", purchase_date: null }), (e: unknown) => {
      assert.ok(e instanceof AppError); assert.equal(e.code, owner === "2" ? "DEVICE_OWNER_MISMATCH" : "SERIAL_ALREADY_EXISTS");
      assert.deepEqual(e.extras, {}); return true;
    });
  }
});
test("P3-U11 soft delete: PATCH tombstone404, DELETE lặp không ghi hoặc cascade", async () => {
  let writes = 0;
  const { pool } = fakePool();
  const repo = { ...customerRepository, findById: async () => ({ ...customer, deleted_at: now }), softDelete: async () => { writes++; } };
  const service = createCustomerService(pool, () => now, repo);
  await assert.rejects(service.patch(nv, 1, { full_name: "X" }), hasCode("CUSTOMER_NOT_FOUND"));
  await service.remove(nv, 1); assert.equal(writes, 0);
});
test("P3-U12 nested ownership404 và device DELETE cho phép cha đã ngừng", async () => {
  const { pool } = fakePool(); let writes = 0;
  const service = createDeviceService(pool, config, () => now,
    { ...customerRepository, findById: async () => ({ ...customer, deleted_at: now }) },
    { ...deviceRepository, findById: async (_db: unknown, _did: number, cid: number) => cid === 1 ? device : undefined, softDelete: async () => { writes++; } });
  await service.remove(nv, 1, 1); assert.equal(writes, 1);
  await assert.rejects(service.remove(nv, 2, 1), hasCode("DEVICE_NOT_FOUND"));
  await assert.rejects(service.patch(nv, 1, 1, null), hasCode("CUSTOMER_NOT_FOUND"));
});
test("P3-U13 PATCH đã quan sát active nhưng mất active trước lock409; device chỉ sửa ngày", async () => {
  const { pool } = fakePool();
  const customerService = createCustomerService(pool, () => now, { ...customerRepository,
    findById: async (_db: unknown, _id: number, _center: number, lock?: boolean) => ({ ...customer, deleted_at: lock ? now : null }) });
  await assert.rejects(customerService.patch(nv, 1, { full_name: "X" }), hasCode("RESOURCE_CHANGED"));
  const inactive = validateReference({ ...config, products: config.products.map(p => ({ ...p, is_active: false })) });
  const deviceService = createDeviceService(pool, inactive, () => now, { ...customerRepository, findById: async () => customer },
    { ...deviceRepository, findById: async () => device, patch: async (_db: unknown, did: number, cid: number, date: string | null) => {
      assert.equal(did, 1); assert.equal(cid, 1); assert.equal(date, "2026-09-01"); return { ...device, purchase_date: date };
    } });
  const result = await deviceService.patch(nv, 1, 1, "2026-09-01"); assert.equal(result.warranty_months, 12);
});
test("P3-U14 error mapping tên riêng đúng404/409 và không phản chiếu PG detail", () => {
  for (const code of ["CUSTOMER_NOT_FOUND", "DEVICE_NOT_FOUND", "PRODUCT_NOT_FOUND"]) assert.equal(publicError(new AppError(code, "Lỗi tài nguyên.")).status, 404);
  for (const code of ["PHONE_ALREADY_EXISTS", "SERIAL_ALREADY_EXISTS", "DEVICE_OWNER_MISMATCH"]) assert.equal(publicError(new AppError(code, "Xung đột.")).status, 409);
  assert.equal(publicError({ code: "23505", detail: "sensitive marker" }).message.includes("sensitive marker"), false);
});
