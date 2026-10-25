import type { PoolClient } from "pg";
import type { NewCustomer, CustomerPatch } from "../customer-device.validation.ts";
type DB = Pick<PoolClient, "query">;
export type CustomerRow = {
  customer_id: string; full_name: string; phone: string; center_id: string;
  address: string | null; created_at: Date; deleted_at: Date | null;
};
const columns = "customer_id::text,full_name,phone,center_id::text,address,created_at,deleted_at";
async function findById(db: DB, id: number, centerId: number, lock = false): Promise<CustomerRow | undefined> {
  const prefix = lock ? "/* l2:customer-lock */ " : "";
  return (await db.query<CustomerRow>(prefix + "SELECT " + columns +
    " FROM customer WHERE customer_id=$1 AND center_id=$2" + (lock ? " FOR UPDATE" : ""), [id, centerId])).rows[0];
}
export const customerRepository = {
  findById,
  async findActiveByPhone(db: DB, phone: string, centerId: number): Promise<CustomerRow | undefined> {
    return (await db.query<CustomerRow>("SELECT " + columns + " FROM customer WHERE phone=$1 AND center_id=$2 AND deleted_at IS NULL", [phone, centerId])).rows[0];
  },
  async create(db: DB, input: NewCustomer, centerId: number, now: Date): Promise<CustomerRow> {
    return (await db.query<CustomerRow>("INSERT INTO customer(full_name,phone,center_id,address,created_at) VALUES($1,$2,$3,$4,$5) RETURNING " + columns,
      [input.full_name, input.phone, centerId, input.address, now])).rows[0]!;
  },
  async patch(db: DB, id: number, centerId: number, patch: CustomerPatch): Promise<CustomerRow | undefined> {
    return (await db.query<CustomerRow>(
      "UPDATE customer SET full_name=CASE WHEN $3::boolean THEN $4::text ELSE full_name END," +
      "address=CASE WHEN $5::boolean THEN $6::text ELSE address END " +
      "WHERE customer_id=$1 AND center_id=$2 AND deleted_at IS NULL RETURNING " + columns,
      [id, centerId, Object.hasOwn(patch, "full_name"), patch.full_name ?? null, Object.hasOwn(patch, "address"), patch.address ?? null])).rows[0];
  },
  async softDelete(db: DB, id: number, centerId: number, now: Date): Promise<void> {
    await db.query("UPDATE customer SET deleted_at=COALESCE(deleted_at,$3::timestamptz) WHERE customer_id=$1 AND center_id=$2", [id, centerId, now]);
  },
};
