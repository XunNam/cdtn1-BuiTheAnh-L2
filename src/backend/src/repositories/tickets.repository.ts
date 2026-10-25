import type { PoolClient } from "pg";
import type { NewTicket } from "../ticket.validation.ts";
import type { Priority } from "../domain/sla.ts";
import type { WarrantyStatus } from "../domain/warranty.ts";
type DB = Pick<PoolClient, "query">;
export type TicketSnapshot = {
  assessed_on: string; purchase_date: string | null; warranty_months: number;
  warranty_expires_on: string | null; warranty_status: WarrantyStatus; requires_approval: boolean;
};
export type TicketRow = {
  ticket_id: string; ticket_code: string; device_id: string; center_id: string; category_id: number;
  issue_desc: string; priority: Priority; status: "MOI" | "DA_PHAN_CONG" | "DANG_XU_LY" | "CHO_LINH_KIEN" | "HOAN_TAT" | "DA_DONG" | "DA_HUY"; received_at: Date; due_date: Date;
  assessed_on: string; purchase_date_snapshot: string | null; warranty_months_snapshot: number;
  warranty_expires_on: string | null; warranty_status: WarrantyStatus;
  approval_status: "KHONG_CAN" | "CHO_PHE_DUYET" | "DA_PHE_DUYET"; approved_by: string | null; approved_at: Date | null; approval_note: string | null;
};
export type TicketDetailRow = TicketRow & { customer_id: string; full_name: string; phone: string; serial_no: string; product_id: string };
export type TicketListRow = Pick<TicketRow, "ticket_id" | "ticket_code" | "device_id" | "center_id" | "warranty_status" | "approval_status" | "status" | "received_at" | "due_date"> & { customer_id: string };
type ListJson = Omit<TicketListRow, "received_at" | "due_date"> & { received_at: string; due_date: string };
const columns = "t.ticket_id::text,t.ticket_code,t.device_id::text,t.center_id::text,t.category_id,t.issue_desc,t.priority,t.status,t.received_at,t.due_date," +
  "t.assessed_on::text,t.purchase_date_snapshot::text,t.warranty_months_snapshot,t.warranty_expires_on::text,t.warranty_status,t.approval_status,t.approved_by::text,t.approved_at,t.approval_note";
export const ticketRepository = {
  async list(db: DB, centers: readonly number[], approval: string, page: number, size: number) {
    const result = (await db.query<{ total: string; tickets: ListJson[] }>(
      "WITH visible AS (SELECT t.ticket_id,t.ticket_code,d.customer_id::text,t.device_id::text,t.center_id::text,t.warranty_status,t.approval_status,t.status,t.received_at,t.due_date " +
      "FROM ticket t JOIN device d USING(device_id) WHERE t.center_id=ANY($1::bigint[]) AND t.deleted_at IS NULL AND t.warranty_status='CHUA_XAC_MINH' AND t.approval_status=$2)," +
      "paged AS (SELECT * FROM visible ORDER BY received_at,ticket_id LIMIT $3 OFFSET $4::bigint) " +
      "SELECT (SELECT count(*)::text FROM visible) AS total,COALESCE((SELECT jsonb_agg(to_jsonb(paged)||jsonb_build_object('ticket_id',ticket_id::text) ORDER BY received_at,ticket_id) FROM paged),'[]'::jsonb) AS tickets",
      [centers, approval, size, (BigInt(page - 1) * BigInt(size)).toString()])).rows[0]!;
    return { total: result.total, tickets: result.tickets.map(row => ({ ...row, received_at: new Date(row.received_at), due_date: new Date(row.due_date) })) };
  },
  async detail(db: DB, id: number, centers: readonly number[]): Promise<TicketDetailRow | undefined> {
    return (await db.query<TicketDetailRow>("SELECT " + columns + ",d.customer_id::text,c.full_name,c.phone,d.serial_no,d.product_id::text " +
      "FROM ticket t JOIN device d USING(device_id) JOIN customer c ON c.customer_id=d.customer_id " +
      "WHERE t.ticket_id=$1 AND t.center_id=ANY($2::bigint[]) AND t.deleted_at IS NULL", [id, centers])).rows[0];
  },
  async lock(db: DB, id: number, centers: readonly number[]): Promise<TicketRow | undefined> {
    return (await db.query<TicketRow>("/* l2:ticket-lock */ SELECT " + columns +
      " FROM ticket t WHERE t.ticket_id=$1 AND t.center_id=ANY($2::bigint[]) AND t.deleted_at IS NULL FOR UPDATE", [id, centers])).rows[0];
  },
  async approve(db: DB, id: number, centers: readonly number[], actor: number, at: Date, note: string | null): Promise<TicketRow | undefined> {
    return (await db.query<TicketRow>("UPDATE ticket t SET approval_status='DA_PHE_DUYET',approved_by=$3,approved_at=$4,approval_note=$5 " +
      "WHERE t.ticket_id=$1 AND t.center_id=ANY($2::bigint[]) AND t.deleted_at IS NULL AND t.warranty_status='CHUA_XAC_MINH' " +
      "AND t.approval_status='CHO_PHE_DUYET' AND t.status='MOI' RETURNING " + columns, [id, centers, actor, at, note])).rows[0];
  },
  async nextCode(db: DB, localYear: string): Promise<string> {
    const counter = (await db.query<{ counter: string }>("SELECT nextval('ticket_code_seq')::text AS counter")).rows[0]!.counter;
    return "BH-" + counter.padStart(6, "0") + "/" + localYear;
  },
  async insert(db: DB, input: NewTicket, actor: number, code: string, received: Date, due: Date, snapshot: TicketSnapshot, approval: "KHONG_CAN" | "CHO_PHE_DUYET"): Promise<TicketRow> {
    return (await db.query<TicketRow>(
      "INSERT INTO ticket(ticket_code,device_id,center_id,received_by,category_id,issue_desc,priority,status,received_at,due_date," +
      "assessed_on,purchase_date_snapshot,warranty_months_snapshot,warranty_expires_on,warranty_status,approval_status) " +
      "VALUES($1,$2,$3,$4,$5,$6,$7,'MOI',$8,$9,$10,$11,$12,$13,$14,$15) RETURNING " +
      "ticket_id::text,ticket_code,device_id::text,center_id::text,category_id,issue_desc,priority,status,received_at,due_date," +
      "assessed_on::text,purchase_date_snapshot::text,warranty_months_snapshot,warranty_expires_on::text,warranty_status,approval_status,approved_by,approved_at,approval_note",
      [code, input.device_id, input.center_id, actor, input.category_id, input.issue_desc, input.priority, received, due,
        snapshot.assessed_on, snapshot.purchase_date, snapshot.warranty_months, snapshot.warranty_expires_on, snapshot.warranty_status,
        approval])).rows[0]!;
  },
  async initialLog(db: DB, ticketId: string, actor: number, received: Date): Promise<void> {
    await db.query("INSERT INTO ticket_status_log(ticket_id,from_status,to_status,changed_at,changed_by) VALUES($1,NULL,'MOI',$2,$3)", [ticketId, received, actor]);
  },
};
