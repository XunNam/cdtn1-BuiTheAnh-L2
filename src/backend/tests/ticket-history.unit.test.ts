import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool, PoolClient } from "pg";
import type { Principal } from "../src/auth.ts";
import { approvalFilter, approvalNote, communicationContent } from "../src/ticket.validation.ts";
import { ticketDto, ticketListDto, ticketDetailDto, approvalDto, communicationDto } from "../src/ticket.dto.ts";
import { ticketRepository } from "../src/repositories/tickets.repository.ts";
import type { TicketDetailRow } from "../src/repositories/tickets.repository.ts";
import { communicationRepository } from "../src/repositories/communications.repository.ts";
import { createTicketService, ticketCenters, ensureApprovalApplicable } from "../src/services/tickets.service.ts";
import { publicError } from "../src/errors.ts";
import { validateReference } from "../src/reference-config.ts";
import { referenceInput } from "./helpers.ts";

const config = validateReference(await referenceInput());
const nv: Principal = { employee_id: 11, role: "NHAN_VIEN_TIEP_NHAN", active_center_id: 1, allowed_center_ids: [1, 2] };
const ql: Principal = { employee_id: 22, role: "QUAN_LY_TTBH", active_center_id: 1, allowed_center_ids: [1, 2] };
const at = new Date("2026-09-28T10:00:00.123+07:00");
const row: TicketDetailRow = { ticket_id: "100", ticket_code: "BH-1000000/2026", customer_id: "9", device_id: "12", center_id: "1",
  category_id: 3, issue_desc: "Lỗi", priority: "CAO", status: "MOI", received_at: new Date("2026-09-28T09:00:00+07:00"), due_date: new Date("2026-09-29T09:00:00+07:00"),
  assessed_on: "2026-09-28", purchase_date_snapshot: null, warranty_months_snapshot: 12, warranty_expires_on: null, warranty_status: "CHUA_XAC_MINH",
  approval_status: "CHO_PHE_DUYET", approved_by: null, approved_at: null, approval_note: null, full_name: "Khách", phone: "0854141105", serial_no: "0012", product_id: "101" };
const code = (value: string) => ({ code: value });
function fakePool() {
  const calls: string[] = [];
  const client = { query: async (sql: string) => { calls.push(sql); return { rows: [] }; }, release: () => { calls.push("RELEASE"); } } as unknown as PoolClient;
  return { calls, client, pool: { connect: async () => client } as unknown as Pool };
}
test("P5-U01 E09 chỉ hai filter, không trim hoặc nhận KHONG_CAN/status lifecycle", () => {
  for (const value of ["CHO_PHE_DUYET", "DA_PHE_DUYET"] as const) assert.equal(approvalFilter(value), value);
  for (const value of ["", null, undefined, "KHONG_CAN", "MOI", " CHO_PHE_DUYET ", []]) assert.throws(() => approvalFilter(value), code("VALIDATION_FAILED"));
});
test("P5-U02 note optional/null/trim1–1000 Unicode, whitelist, không ép buộc ghi chú", () => {
  assert.equal(approvalNote({}), null); assert.equal(approvalNote({ note: null }), null);
  assert.equal(approvalNote({ note: "\uFEFF 😀 \u3000" }), "😀");
  assert.equal(Array.from(approvalNote({ note: "😀".repeat(1000) })!).length, 1000);
  for (const input of [[], null, { note: "" }, { note: "\uFEFF\u3000" }, { note: 1 }, { note: "😀".repeat(1001) }, { note: "\0" }, { note: "\ud800" }])
    assert.throws(() => approvalNote(input), code("VALIDATION_FAILED"));
  for (const key of ["approved_by", "approved_at", "approval_status", "role", "center_id", "action"])
    assert.throws(() => approvalNote({ [key]: "client" }), code("VALIDATION_FAILED"));
});
test("P5-U03 content dùng Unicode/trim chung,1/2000/2001, không actor/time client", () => {
  assert.equal(communicationContent({ content: "\uFEFF😀\u3000" }), "😀");
  assert.equal(Array.from(communicationContent({ content: "😀".repeat(2000) })).length, 2000);
  for (const input of [{}, [], null, { content: null }, { content: 1 }, { content: "\u00a0\u2000\u2028" }, { content: "😀".repeat(2001) }, { content: "\ud800" }])
    assert.throws(() => communicationContent(input), code("VALIDATION_FAILED"));
  for (const key of ["created_by", "created_at", "communication_id", "ticket_id", "role"])
    assert.throws(() => communicationContent({ content: "ok", [key]: 1 }), code("VALIDATION_FAILED"));
});
test("P5-U04 scope NV chỉ active center dù membership nhiều, QL đủ allowed centers", () => {
  assert.deepEqual(ticketCenters(nv), [1]); assert.deepEqual(ticketCenters(ql), [1, 2]);
  assert.deepEqual(ticketCenters({ ...nv, active_center_id: 3 }), []);
});
test("P5-U05 approval chỉ CHUA+CHO+MOI, đã duyệt conflict riêng", () => {
  assert.doesNotThrow(() => ensureApprovalApplicable(row));
  assert.throws(() => ensureApprovalApplicable({ ...row, approval_status: "DA_PHE_DUYET" }), code("ALREADY_APPROVED"));
  for (const warranty_status of ["CON_BAO_HANH", "HET_BAO_HANH"] as const)
    assert.throws(() => ensureApprovalApplicable({ ...row, warranty_status, approval_status: "KHONG_CAN" }), code("APPROVAL_NOT_APPLICABLE"));
  for (const status of ["DA_PHAN_CONG", "DANG_XU_LY", "CHO_LINH_KIEN", "HOAN_TAT", "DA_DONG", "DA_HUY"] as const)
    assert.throws(() => ensureApprovalApplicable({ ...row, status }), code("APPROVAL_NOT_APPLICABLE"));
});
test("P5-U06 E10 DTO exact field, snapshot DATE, phone masking tái sử dụng và can_proceed sau duyệt", () => {
  const nvDto = ticketDetailDto(row, nv.role), qlDto = ticketDetailDto(row, ql.role);
  assert.equal(nvDto.customer.phone, "085****105"); assert.equal(qlDto.customer.phone, "0854141105");
  assert.deepEqual(Object.keys(nvDto).sort(), [...Object.keys(ticketDto(row, 9)), "customer", "device"].sort());
  assert.deepEqual(nvDto.device, { device_id: 12, serial_no: "0012", product_id: 101 });
  assert.deepEqual(Object.keys(nvDto.customer).sort(), ["customer_id", "full_name", "phone"].sort());
  const approved = ticketDetailDto({ ...row, approval_status: "DA_PHE_DUYET", approved_by: "22", approved_at: at, approval_note: "ok" }, nv.role);
  assert.equal(approved.can_proceed, true); assert.equal(approved.approved_by, 22); assert.equal(approved.approved_at, "2026-09-28T10:00:00.123+07:00");
  assert.equal(approved.purchase_date_snapshot, null); assert.equal(approved.warranty_status, "CHUA_XAC_MINH");
  assert.equal(ticketDto({ ...row, approval_status: "KHONG_CAN" }, 9).can_proceed, true);
  assert.throws(() => ticketDetailDto({ ...row, approved_by: "9007199254740992" }, ql.role));
});
test("P5-U07 E09/E11 DTO không lộ phone/actor dư thừa, timestamps+07 và safe ID", () => {
  const list = ticketListDto(row);
  assert.deepEqual(Object.keys(list).sort(), ["ticket_id", "ticket_code", "customer_id", "device_id", "center_id", "warranty_status", "approval_status", "status", "received_at", "due_date", "can_proceed"].sort());
  const approved = approvalDto({ ...row, approved_by: "22", approved_at: at, approval_status: "DA_PHE_DUYET" });
  assert.deepEqual(Object.keys(approved).sort(), ["ticket_id", "status", "warranty_status", "approval_status", "approved_by", "approved_at", "approval_note", "can_proceed"].sort());
  assert.equal(approved.can_proceed, true); assert.equal(approved.approved_by, 22);
});
test("P5-U08 communication DTO chỉ5 field, số actor/ID và timestamp offset", () => {
  assert.deepEqual(communicationDto({ communication_id: "99", ticket_id: "100", content: "😀", created_at: at, created_by: "11" }),
    { communication_id: 99, ticket_id: 100, content: "😀", created_at: "2026-09-28T10:00:00.123+07:00", created_by: 11 });
});
test("P5-U09 E09 service truyền scope/filter/page nguyên vẹn, NV bị chặn trước repository", async () => {
  let called = 0;
  const service = createTicketService({} as Pool, config, () => at, { ...ticketRepository,
    list: async (_db, centers, filter, page, size) => { called++; assert.deepEqual(centers, [1, 2]); assert.equal(filter, "DA_PHE_DUYET"); assert.equal(page, 2); assert.equal(size, 10); return { total: "42", tickets: [] }; },
  });
  await assert.rejects(service.list(nv, "DA_PHE_DUYET", 2, 10), code("ROLE_FORBIDDEN")); assert.equal(called, 0);
  assert.deepEqual(await service.list(ql, "DA_PHE_DUYET", 2, 10), { data: [], meta: { page: 2, size: 10, total: 42 } });
});
test("P5-U10 E10 service không gọi clock/domain tính lại, missing404; snapshot cũ", async () => {
  const service = createTicketService({} as Pool, config, () => { throw new Error("Không được đọc clock khi xem lịch sử"); }, { ...ticketRepository,
    detail: async (_db, id, centers) => { assert.deepEqual(centers, [1]); return id === 100 ? row : undefined; },
  });
  const before = JSON.stringify(row), dto = await service.detail(nv, 100);
  assert.equal(dto.assessed_on, "2026-09-28"); assert.equal(dto.customer.phone, "085****105");
  assert.equal(JSON.stringify(row), before); await assert.rejects(service.detail(nv, 101), code("TICKET_NOT_FOUND"));
});
test("P5-U11 E11 dùng cùng transaction/client, server actor/time, không log/SLA update", async () => {
  const f = fakePool(); const seen: string[] = [];
  const service = createTicketService(f.pool, config, () => at, { ...ticketRepository,
    lock: async (db, id, centers) => { assert.equal(db, f.client); assert.equal(id, 100); assert.deepEqual(centers, [1, 2]); seen.push("LOCK"); return row; },
    approve: async (db, id, centers, actor, time, note) => { assert.equal(db, f.client); assert.equal(actor, 22); assert.equal(time, at); assert.equal(note, "ok"); seen.push("GUARDED_UPDATE"); return { ...row, approved_by: String(actor), approved_at: time, approval_status: "DA_PHE_DUYET", approval_note: note }; },
    initialLog: async () => { assert.fail("Không ghi log khi phê duyệt"); },
  });
  const result = await service.approve(ql, 100, "ok");
  assert.equal(result.can_proceed, true); assert.equal(result.status, "MOI"); assert.equal(result.warranty_status, "CHUA_XAC_MINH");
  assert.deepEqual(seen, ["LOCK", "GUARDED_UPDATE"]); assert.deepEqual(f.calls, ["BEGIN", "COMMIT", "RELEASE"]);
});
test("P5-U12 E11 role/scope/đã duyệt/guard0/failure rollback, không overwrite", async () => {
  for (const mode of ["missing", "approved", "guard", "error"] as const) {
    const f = fakePool(); let updates = 0;
    const service = createTicketService(f.pool, config, () => at, { ...ticketRepository,
      lock: async () => mode === "missing" ? undefined : mode === "approved" ? { ...row, approval_status: "DA_PHE_DUYET" } : row,
      approve: async () => { updates++; if (mode === "error") throw new Error("private database detail"); return undefined; },
    });
    await assert.rejects(service.approve(nv, 100, null), code("ROLE_FORBIDDEN")); assert.deepEqual(f.calls, []);
    await assert.rejects(service.approve(ql, 100, null), code(mode === "missing" ? "TICKET_NOT_FOUND" : mode === "approved" ? "ALREADY_APPROVED" : mode === "guard" ? "APPROVAL_NOT_APPLICABLE" : "INTERNAL_ERROR"));
    assert.equal(updates, mode === "missing" || mode === "approved" ? 0 : 1); assert.deepEqual(f.calls, ["BEGIN", "ROLLBACK", "RELEASE"]);
  }
});
test("P5-U13 E12 empty khác404, scope/page; NV/QL đọc không clock hoặc ghi", async () => {
  const service = createTicketService({} as Pool, config, () => { throw new Error("read clock"); }, ticketRepository, { ...communicationRepository,
    list: async (_db, id, centers, page, size) => { assert.equal(page, 1); assert.equal(size, 20); assert.ok(centers.includes(1)); return { ticket_id: id === 100 ? "100" : null, total: "0", communications: [] }; },
  });
  for (const actor of [nv, ql]) {
    assert.deepEqual(await service.communications(actor, 100, 1, 20), { data: [], meta: { page: 1, size: 20, total: 0 } });
    await assert.rejects(service.communications(actor, 101, 1, 20), code("TICKET_NOT_FOUND"));
  }
});
test("P5-U14 E13 NV ghi khi chờ duyệt, QL403, actor/time server và giữ ticket", async () => {
  const f = fakePool(), before = JSON.stringify(row);
  const service = createTicketService(f.pool, config, () => at, { ...ticketRepository, lock: async (db) => { assert.equal(db, f.client); return row; } }, { ...communicationRepository,
    insert: async (db, id, content, actor, time) => { assert.equal(db, f.client); assert.equal(actor, 11); assert.equal(time, at); return { communication_id: "101", ticket_id: String(id), content, created_by: String(actor), created_at: time }; },
  });
  await assert.rejects(service.communicate(ql, 100, "x"), code("ROLE_FORBIDDEN")); assert.deepEqual(f.calls, []);
  assert.equal((await service.communicate(nv, 100, "x")).created_by, 11);
  assert.equal(JSON.stringify(row), before); assert.deepEqual(f.calls, ["BEGIN", "COMMIT", "RELEASE"]);
});
test("P5-U15 E13 missing/failure rollback và lỗi contract404/409/500 không detail", async () => {
  for (const missing of [true, false]) {
    const f = fakePool();
    const service = createTicketService(f.pool, config, () => at, { ...ticketRepository, lock: async () => missing ? undefined : row }, { ...communicationRepository,
      insert: async () => { throw new Error("raw SQL and private detail"); },
    });
    await assert.rejects(service.communicate(nv, 100, "ok"), (error: unknown) => {
      const result = publicError(error); assert.equal(result.status, missing ? 404 : 500); assert.ok(!result.message.includes("private")); return true;
    });
    assert.deepEqual(f.calls, ["BEGIN", "ROLLBACK", "RELEASE"]);
  }
  for (const [value, status] of [["TICKET_NOT_FOUND", 404], ["ALREADY_APPROVED", 409], ["APPROVAL_NOT_APPLICABLE", 409]] as const) {
    const { AppError } = await import("../src/errors.ts"); assert.equal(publicError(new AppError(value, "test")).status, status);
  }
});
