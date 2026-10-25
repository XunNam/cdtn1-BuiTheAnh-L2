import type { PoolClient } from "pg";
import type { NewDevice } from "../customer-device.validation.ts";
type DB = Pick<PoolClient, "query">;
export type DeviceRow = {
  device_id: string; customer_id: string; product_id: string; serial_no: string;
  purchase_date: string | null; warranty_months: number; deleted_at: Date | null;
};
const columns = "device_id::text,customer_id::text,product_id::text,serial_no,purchase_date::text,warranty_months,deleted_at";
export const deviceRepository = {
  async findInScope(db: DB, id: number, centerId: number): Promise<DeviceRow | undefined> {
    return (await db.query<DeviceRow>(
      "SELECT d.device_id::text,d.customer_id::text,d.product_id::text,d.serial_no,d.purchase_date::text,d.warranty_months,d.deleted_at " +
      "FROM device d JOIN customer c USING(customer_id) WHERE d.device_id=$1 AND c.center_id=$2 AND c.deleted_at IS NULL AND d.deleted_at IS NULL",
      [id, centerId])).rows[0];
  },
  async findById(db: DB, id: number, customerId: number, lock = false): Promise<DeviceRow | undefined> {
    return (await db.query<DeviceRow>((lock ? "/* l2:device-lock */ " : "") + "SELECT " + columns +
      " FROM device WHERE device_id=$1 AND customer_id=$2" + (lock ? " FOR UPDATE" : ""), [id, customerId])).rows[0];
  },
  async findBySerial(db: DB, serial: string): Promise<(DeviceRow & { center_id: string; customer_deleted_at: Date | null }) | undefined> {
    return (await db.query<DeviceRow & { center_id: string; customer_deleted_at: Date | null }>(
      "SELECT d.device_id::text,d.customer_id::text,d.product_id::text,d.serial_no,d.purchase_date::text,d.warranty_months,d.deleted_at," +
      "c.center_id::text,c.deleted_at AS customer_deleted_at FROM device d JOIN customer c ON c.customer_id=d.customer_id WHERE d.serial_no=$1", [serial])).rows[0];
  },
  async list(db: DB, customerId: number, centerId: number, serial: string | null, page: number, size: number) {
    // Parent, total và trang cùng một MVCC snapshot, kể cả khi trang rỗng.
    const { rows } = await db.query<{ customer_id: string | null; total: string; devices: DeviceRow[] }>(
      "WITH visible_customer AS (SELECT customer_id FROM customer WHERE customer_id=$1 AND center_id=$2 AND deleted_at IS NULL)," +
      "visible_devices AS (SELECT d.* FROM device d JOIN visible_customer c USING(customer_id) WHERE d.deleted_at IS NULL AND ($3::text IS NULL OR d.serial_no=$3))," +
      "paged AS (SELECT " + columns + " FROM visible_devices ORDER BY visible_devices.device_id LIMIT $4 OFFSET $5::bigint) " +
      "SELECT (SELECT customer_id::text FROM visible_customer) AS customer_id,(SELECT count(*)::text FROM visible_devices) AS total," +
      "COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY device_id::bigint) FROM paged),'[]'::jsonb) AS devices",
      [customerId, centerId, serial, size, (BigInt(page - 1) * BigInt(size)).toString()]);
    return rows[0]!;
  },
  async create(db: DB, customerId: number, input: NewDevice, months: number): Promise<DeviceRow> {
    return (await db.query<DeviceRow>("INSERT INTO device(customer_id,product_id,serial_no,purchase_date,warranty_months) VALUES($1,$2,$3,$4,$5) RETURNING " + columns,
      [customerId, input.product_id, input.serial_no, input.purchase_date, months])).rows[0]!;
  },
  async patch(db: DB, id: number, customerId: number, date: string | null): Promise<DeviceRow | undefined> {
    return (await db.query<DeviceRow>("UPDATE device SET purchase_date=$3::date WHERE device_id=$1 AND customer_id=$2 AND deleted_at IS NULL RETURNING " + columns,
      [id, customerId, date])).rows[0];
  },
  async softDelete(db: DB, id: number, customerId: number, now: Date): Promise<void> {
    await db.query("UPDATE device SET deleted_at=COALESCE(deleted_at,$3::timestamptz) WHERE device_id=$1 AND customer_id=$2", [id, customerId, now]);
  },
};
