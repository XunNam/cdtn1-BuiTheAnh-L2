import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { assessWarranty, calendarDate, initialApproval } from "../src/domain/warranty.ts";
import { computeDueDate, priority } from "../src/domain/sla.ts";
import { localDate, timestamp } from "../src/domain/business-time.ts";
import { newTicket } from "../src/ticket.validation.ts";
import { AppError, publicError } from "../src/errors.ts";
import { createCatalogService, categoryLabel } from "../src/services/catalog.service.ts";
import { referenceInput } from "./helpers.ts";
import { validateReference } from "../src/reference-config.ts";

const principal = { employee_id: 11, role: "NHAN_VIEN_TIEP_NHAN", active_center_id: 1, allowed_center_ids: [1] } as const;
const valid = { customer_id: 1, device_id: 1, center_id: 1, category_id: 1, issue_desc: "x", priority: "CAO" };
const invalid = (fn: () => unknown, field?: string) => assert.throws(fn, (e: unknown) =>
  e instanceof AppError && e.code === "VALIDATION_FAILED" && (!field || Object.hasOwn(e.fields, field)));

test("P4-U01 catalog: active, numeric sort, exact DTO, pagination và config không bị sửa", async () => {
  const input = await referenceInput();
  input.products.reverse(); input.products[0].product_id = 9;
  const config = validateReference(input), before = JSON.stringify(config);
  const service = createCatalogService({} as Pool, config);
  const first = service.products(principal, 1, 2);
  assert.deepEqual(first.data.map(p => p.product_id), [101, 102]);
  assert.deepEqual(first.meta, { page: 1, size: 2, total: 3 });
  assert.deepEqual(Object.keys(first.data[0]!).sort(), ["product_id", "product_name", "warranty_months"].sort());
  assert.equal(service.products(principal, 2, 2).data.length, 1);
  assert.deepEqual(service.products(principal, Number.MAX_SAFE_INTEGER, 100).data, []);
  assert.equal(JSON.stringify(config), before);
  input.products.forEach((p: { is_active: boolean }) => { p.is_active = false; });
  assert.deepEqual(createCatalogService({} as Pool, validateReference(input)).products(principal, 1, 20), { data: [], meta: { page: 1, size: 20, total: 0 } });
  assert.throws(() => service.products({ ...principal, role: "QUAN_LY_TTBH" }, 1, 20), { code: "ROLE_FORBIDDEN" });
});
test("P4-U02 config thiếu/sai dừng trước khi phục vụ catalog, public error500 an toàn", async () => {
  for (const mutate of [
    (x: Record<string, unknown>) => { delete x.products; },
    (x: Record<string, unknown>) => { x.products = []; },
    (x: Record<string, unknown>) => { x.products = [{ product_id: 1, product_name: "x", warranty_months: 121, is_active: true }]; },
  ]) {
    const input = await referenceInput(); mutate(input);
    assert.throws(() => createCatalogService({} as Pool, input), (error: unknown) => {
      assert.equal(publicError(error).status, 500); return error instanceof AppError && error.code === "CONFIGURATION_ERROR";
    });
  }
});
test("P4-U03 category sáu mã theo CS, không default priority hoặc nhãn ngoài nguồn", () => {
  assert.deepEqual(["MAN_HINH", "PIN", "SAC", "PHAN_MEM", "NUOC_VAO", "KHAC"].map(categoryLabel), ["Màn hình", "Pin", "Sạc", "Phần mềm", "Nước vào", "Khác"]);
  assert.throws(() => categoryLabel("toString"), { code: "CONFIGURATION_ERROR" });
});

const warrantyCases: [string, string | null, number, string, string | null, string][] = [
  ["còn", "2026-09-01", 12, "2026-09-30", "2027-09-01", "CON_BAO_HANH"],
  ["hết", "2025-09-01", 12, "2026-09-28", "2026-09-01", "HET_BAO_HANH"],
  ["thiếu", null, 12, "2026-09-28", null, "CHUA_XAC_MINH"],
  ["clamp inclusive", "2026-01-31", 1, "2026-02-28", "2026-02-28", "CON_BAO_HANH"],
  ["sau clamp", "2026-01-31", 1, "2026-03-01", "2026-02-28", "HET_BAO_HANH"],
  ["cộng đích một lần", "2026-01-31", 2, "2026-03-31", "2026-03-31", "CON_BAO_HANH"],
  ["nhuận", "2024-02-29", 12, "2025-02-28", "2025-02-28", "CON_BAO_HANH"],
  ["0 inclusive", "2026-09-28", 0, "2026-09-28", "2026-09-28", "CON_BAO_HANH"],
  ["0 sau ngày mua", "2026-09-28", 0, "2026-09-29", "2026-09-28", "HET_BAO_HANH"],
  ["120 và năm", "2020-12-31", 120, "2030-12-31", "2030-12-31", "CON_BAO_HANH"],
  ["thế kỷ không nhuận", "2000-02-29", 120, "2010-02-28", "2010-02-28", "CON_BAO_HANH"],
];
for (const [name, purchase, months, assessed, expires, status] of warrantyCases) test("P4-W " + name, () => {
  const input = Object.freeze({ purchase, months, assessed });
  const result = assessWarranty(input.purchase, input.months, input.assessed);
  assert.deepEqual(result, { assessed_on: assessed, purchase_date: purchase, warranty_months: months,
    warranty_expires_on: expires, warranty_status: status, requires_approval: status === "CHUA_XAC_MINH" });
});
test("P4-U04 warranty validation: DATE khác TIMESTAMP, future, months sai", () => {
  for (const date of ["2026-02-29", "2026-1-01", "0000-01-01", "2026-09-28T09:00:00+07:00", "2026-13-01"])
    invalid(() => calendarDate(date, "assessment_date"), "assessment_date");
  invalid(() => assessWarranty("2026-09-29", 12, "2026-09-28"), "assessment_date");
  for (const n of [-1, 121, 1.5, NaN]) assert.throws(() => assessWarranty(null, n, "2026-09-28"), { code: "CONFIGURATION_ERROR" });
  // Assessment có thể ở tương lai; không tự áp ngưỡng ngày máy lên preview.
  assert.equal(assessWarranty("2026-09-01", 12, "2030-01-01").warranty_status, "HET_BAO_HANH");
});
test("P4-U05 Clock localdate tại ranh UTC và timestamp giữ milliseconds", () => {
  const time = new Date("2026-09-27T17:00:00.123Z");
  assert.equal(localDate(time), "2026-09-28");
  assert.equal(timestamp(time), "2026-09-28T00:00:00.123+07:00");
});
test("P4-U07 DD01/02 matrix ban đầu: CON/HET không cần duyệt, CHUA chờ duyệt", () => {
  assert.equal(initialApproval("CON_BAO_HANH"), "KHONG_CAN");
  assert.equal(initialApproval("HET_BAO_HANH"), "KHONG_CAN");
  assert.equal(initialApproval("CHUA_XAC_MINH"), "CHO_PHE_DUYET");
});

const slaCases: [string, "CAO" | "TRUNG_BINH" | "THAP", string][] = [
  ["2026-09-28T09:00:00", "CAO", "2026-09-29T09:00:00"],
  ["2026-09-28T09:00:00", "TRUNG_BINH", "2026-10-01T09:00:00"],
  ["2026-09-28T09:00:00", "THAP", "2026-10-03T09:00:00"],
  ["2026-10-03T09:00:00", "CAO", "2026-10-05T09:00:00"],
  ["2026-10-03T09:00:00", "TRUNG_BINH", "2026-10-07T09:00:00"],
  ["2026-10-03T09:00:00", "THAP", "2026-10-09T09:00:00"],
  ["2026-10-04T09:00:00", "CAO", "2026-10-06T00:00:00"],
  ["2026-10-04T09:00:00", "TRUNG_BINH", "2026-10-08T00:00:00"],
  ["2026-10-04T09:00:00", "THAP", "2026-10-10T00:00:00"],
  ["2026-10-03T00:00:00", "CAO", "2026-10-05T00:00:00"],
  ["2026-10-04T00:00:00", "CAO", "2026-10-06T00:00:00"],
  ["2026-10-02T09:00:00", "TRUNG_BINH", "2026-10-06T09:00:00"],
  ["2026-12-31T23:59:59.987", "THAP", "2027-01-06T23:59:59.987"],
  ["2026-10-31T23:59:59.987", "CAO", "2026-11-02T23:59:59.987"],
];
for (const [start, level, end] of slaCases) test("P4-S " + start + " " + level, () => {
  const input = new Date(start + "+07:00"), before = input.getTime();
  assert.equal(computeDueDate(input, level).getTime(), new Date(end + "+07:00").getTime());
  assert.equal(input.getTime(), before);
});
test("P4-U06 E08 whitelist, safe IDs, priority bắt buộc và1/2000/2001 Unicode", () => {
  assert.deepEqual(newTicket({ ...valid, issue_desc: "\uFEFF 😀 \u3000" }), { ...valid, issue_desc: "😀" });
  assert.equal(Array.from(newTicket({ ...valid, issue_desc: "😀".repeat(2000) }).issue_desc).length, 2000);
  for (const desc of ["😀".repeat(2001), "\u00a0\u2000\u2028\uFEFF", "\0", "\ud800", null, 1]) invalid(() => newTicket({ ...valid, issue_desc: desc }), "issue_desc");
  for (const field of ["customer_id", "device_id", "category_id", "center_id"]) {
    for (const value of [0, -1, 1.5, "1", null, Number.MAX_SAFE_INTEGER + 1]) invalid(() => newTicket({ ...valid, [field]: value }), field);
    const body: Record<string, unknown> = { ...valid }; delete body[field]; invalid(() => newTicket(body), field);
  }
  for (const field of ["ticket_id", "ticket_code", "received_at", "received_by", "status", "due_date", "assessed_on", "purchase_date_snapshot", "warranty_months_snapshot", "warranty_expires_on", "warranty_status", "approval_status", "approved_by", "approved_at", "approval_note", "can_proceed", "role"])
    invalid(() => newTicket({ ...valid, [field]: "x" }), "body");
  const missing: Record<string, unknown> = { ...valid }; delete missing.priority; invalid(() => newTicket(missing), "priority");
  for (const value of [null, "", "cao", " CAO ", 1]) invalid(() => priority(value), "priority");
  assert.throws(() => computeDueDate(new Date(NaN), "CAO"), { code: "CONFIGURATION_ERROR" });
});
