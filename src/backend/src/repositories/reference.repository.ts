import type { Pool } from "pg";

// ID dependency đã dùng, bao gồm tombstone và lịch sử; không quyết định quyền hiện tại.
export async function listReferenceIds(pool: Pool) {
  return (await pool.query<{ kind: string; ref: string }>(
    "SELECT 'center' AS kind, center_id::text AS ref FROM customer " +
    "UNION SELECT 'center', center_id::text FROM ticket " +
    "UNION SELECT 'product', product_id::text FROM device " +
    "UNION SELECT 'account', received_by::text FROM ticket " +
    "UNION SELECT 'account', approved_by::text FROM ticket WHERE approved_by IS NOT NULL " +
    "UNION SELECT 'account', changed_by::text FROM ticket_status_log " +
    "UNION SELECT 'account', created_by::text FROM ticket_communication")).rows;
}
