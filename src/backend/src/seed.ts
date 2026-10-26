import type { Pool, PoolClient } from "pg";
import type { ReferenceConfig } from "./reference-config.ts";
import { checkReferences } from "./reference-config.ts";
import { checkDatabase, withTransaction } from "./db.ts";
import { assertMigrationsCurrent } from "./migrate.ts";
import { configurationError } from "./errors.ts";
import { serviceCenterRepository } from "./repositories/service-centers.repository.ts";

const received = "2026-09-28T09:00:00+07:00";
const removed = "2026-09-29T09:00:00+07:00";
const categories = ["MAN_HINH", "PIN", "SAC", "PHAN_MEM", "NUOC_VAO", "KHAC"] as const;
const priorities = ["CAO", "TRUNG_BINH", "THAP"] as const;
const due = ["2026-09-29T09:00:00+07:00", "2026-10-01T09:00:00+07:00", "2026-10-03T09:00:00+07:00"];
// Fixture v1: kết quả ngày/SLA cố định đã kiểm; đây không phải service nghiệp vụ Phase 4.
export async function seed(pool: Pool, config: ReferenceConfig) {
  await checkDatabase(pool, false);
  await assertMigrationsCurrent(pool);
  await checkReferences(pool, config);
  const centers = await serviceCenterRepository.list(pool);
  for (const id of [1, 2]) if (!centers.some(c => c.center_id === String(id) && c.is_active)) configurationError("Fixture v1 cần center demo 1/2 đang hoạt động trong CSDL.");
  for (const [id, months] of [[101, 12], [102, 0], [103, 120]]) {
    if (!config.products.some(p => p.product_id === id && p.warranty_months === months && p.is_active)) configurationError("Fixture v1 không tương thích product config.");
  }
  for (const id of [11, 12, 21, 22, 31]) if (!config.accounts.some(a => a.employee_id === id)) configurationError("Fixture v1 thiếu actor config.");
  return withTransaction(pool, async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext(current_database()), hashtext(current_schema() || ':l2-seed'))");
    const categoryIds: string[] = [];
    for (const name of categories) {
      await client.query("INSERT INTO issue_category(category_name,default_priority) VALUES($1,'TRUNG_BINH') ON CONFLICT(category_name) DO NOTHING", [name]);
      categoryIds.push((await client.query<{ category_id: string }>("SELECT category_id::text FROM issue_category WHERE category_name=$1", [name])).rows[0]!.category_id);
    }
    const devices: { deviceId: string; centerId: number; purchase: string | null; months: number; expiry: string | null; warranty: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const centerId = i % 2 + 1;
      const phone = "099" + String(i + 1).padStart(7, "0");
      const serial = "L2-DEMO-V1-" + String(i + 1).padStart(3, "0");
      const shape = i % 5;
      const productId = shape === 3 ? 102 : shape === 4 ? 103 : 101;
      const months = config.products.find(p => p.product_id === productId)!.warranty_months;
      const purchase = shape === 2 ? null : shape === 1 || shape === 4 ? "2020-01-01" : shape === 3 ? "2026-09-28" : "2026-09-01";
      const expiry = shape === 2 ? null : shape === 1 ? "2021-01-01" : shape === 4 ? "2030-01-01" : shape === 3 ? "2026-09-28" : "2027-09-01";
      const warranty = shape === 2 ? "CHUA_XAC_MINH" : shape === 1 ? "HET_BAO_HANH" : "CON_BAO_HANH";
      await client.query("INSERT INTO customer(full_name,phone,center_id,address,created_at,deleted_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(phone) DO NOTHING",
        ["Khách mô phỏng " + String(i + 1).padStart(2, "0"), phone, centerId, "Địa chỉ mô phỏng", received, i === 29 ? removed : null]);
      const customer = (await client.query<{ customer_id: string; center_id: string }>("SELECT customer_id::text,center_id::text FROM customer WHERE phone=$1 FOR UPDATE", [phone])).rows[0]!;
      if (Number(customer.center_id) !== centerId) configurationError("Khóa fixture customer xung đột dữ liệu hiện có; không ghi đè.");
      await client.query("INSERT INTO device(customer_id,product_id,serial_no,purchase_date,warranty_months,deleted_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(serial_no) DO NOTHING",
        [customer.customer_id, productId, serial, purchase, months, i === 28 ? removed : null]);
      const device = (await client.query<{ device_id: string; customer_id: string; product_id: string; warranty_months: number }>(
        "SELECT device_id::text,customer_id::text,product_id::text,warranty_months FROM device WHERE serial_no=$1 FOR UPDATE", [serial])).rows[0]!;
      if (device.customer_id !== customer.customer_id || Number(device.product_id) !== productId || device.warranty_months !== months)
        configurationError("Khóa fixture device xung đột owner/product/months; không ghi đè.");
      devices.push({ deviceId: device.device_id, centerId, purchase, months, expiry, warranty });
    }
    let ticketsCreated = 0;
    for (let i = 0; i < 200; i++) {
      const d = devices[i % devices.length]!;
      const code = "BH-" + (900001 + i) + "/2026";
      const unknown = d.warranty === "CHUA_XAC_MINH";
      const approved = unknown && Math.floor(i / devices.length) % 2 === 1;
      const actor = i === 0 ? 31 : d.centerId === 1 ? 11 : 12;
      const approval = approved ? "DA_PHE_DUYET" : unknown ? "CHO_PHE_DUYET" : "KHONG_CAN";
      const inserted = await client.query<{ ticket_id: string }>(
        "INSERT INTO ticket(ticket_code,device_id,center_id,received_by,category_id,issue_desc,priority,status,received_at,due_date," +
        "warranty_status,assessed_on,purchase_date_snapshot,warranty_months_snapshot,warranty_expires_on,approval_status,approved_by,approved_at,approval_note) " +
        "VALUES($1,$2,$3,$4,$5,$6,$7,'MOI',$8,$9,$10,'2026-09-28',$11,$12,$13,$14,$15,$16,$17) " +
        "ON CONFLICT(ticket_code) DO NOTHING RETURNING ticket_id::text",
        [code, d.deviceId, d.centerId, actor, categoryIds[i % 6], "Phiếu mô phỏng L2 fixture v1", priorities[i % 3], received, due[i % 3],
          d.warranty, d.purchase, d.months, d.expiry, approval, approved ? d.centerId === 1 ? 21 : 22 : null,
          approved ? "2026-09-28T10:00:00+07:00" : null, approved ? "Phê duyệt mô phỏng thiếu ngày mua." : null]);
      const ticketId = inserted.rows[0]?.ticket_id;
      if (ticketId) {
        ticketsCreated++;
        await client.query("INSERT INTO ticket_status_log(ticket_id,from_status,to_status,changed_at,changed_by,note) VALUES($1,NULL,'MOI',$2,$3,$4)",
          [ticketId, received, actor, "Khởi tạo fixture v1"]);
        if (i < 30) await client.query("INSERT INTO ticket_communication(ticket_id,content,created_at,created_by) VALUES($1,$2,$3,$4)",
          [ticketId, "Trao đổi mô phỏng fixture v1", "2026-09-28T09:10:00+07:00", actor]);
      } else {
        const existing = (await client.query<{ ticket_id: string; device_id: string; center_id: string }>(
          "SELECT ticket_id::text,device_id::text,center_id::text FROM ticket WHERE ticket_code=$1 FOR UPDATE", [code])).rows[0]!;
        if (existing.device_id !== d.deviceId || Number(existing.center_id) !== d.centerId) configurationError("Khóa fixture ticket xung đột quan hệ; không ghi đè.");
        const log = await client.query("SELECT 1 FROM ticket_status_log WHERE ticket_id=$1 AND from_status IS NULL", [existing.ticket_id]);
        if (log.rowCount !== 1) configurationError("Ticket fixture thiếu log ban đầu; không tự sửa lịch sử.");
      }
    }
    return { fixture_version: 1, tickets_created: ticketsCreated, counts: await tableCounts(client) };
  });
}
export async function tableCounts(client: Pick<PoolClient, "query">) {
  const result: Record<string, number> = {};
  // Danh sách identifier cố định, không lấy từ request/config.
  for (const table of ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication"]) {
    result[table] = Number((await client.query<{ total: string }>("SELECT count(*)::text AS total FROM " + table)).rows[0]!.total);
  }
  return result;
}
