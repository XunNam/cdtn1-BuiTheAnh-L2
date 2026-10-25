import type { PoolClient } from "pg";
type DB = Pick<PoolClient, "query">;
export type CommunicationRow = { communication_id: string; ticket_id: string; content: string; created_at: Date; created_by: string };
type CommunicationJson = Omit<CommunicationRow, "created_at"> & { created_at: string };
export const communicationRepository = {
  async list(db: DB, id: number, centers: readonly number[], page: number, size: number) {
    const result = (await db.query<{ ticket_id: string | null; total: string; communications: CommunicationJson[] }>(
      "WITH visible_ticket AS (SELECT ticket_id FROM ticket WHERE ticket_id=$1 AND center_id=ANY($2::bigint[]) AND deleted_at IS NULL)," +
      "visible AS (SELECT c.* FROM ticket_communication c JOIN visible_ticket USING(ticket_id))," +
      "paged AS (SELECT communication_id::text,ticket_id::text,content,created_at,created_by::text FROM visible ORDER BY visible.created_at,visible.communication_id LIMIT $3 OFFSET $4::bigint) " +
      "SELECT (SELECT ticket_id::text FROM visible_ticket) AS ticket_id,(SELECT count(*)::text FROM visible) AS total," +
      "COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at,communication_id::bigint) FROM paged),'[]'::jsonb) AS communications",
      [id, centers, size, (BigInt(page - 1) * BigInt(size)).toString()])).rows[0]!;
    return { ...result, communications: result.communications.map(row => ({ ...row, created_at: new Date(row.created_at) })) };
  },
  async insert(db: DB, id: number, content: string, actor: number, at: Date): Promise<CommunicationRow> {
    return (await db.query<CommunicationRow>("INSERT INTO ticket_communication(ticket_id,content,created_by,created_at) VALUES($1,$2,$3,$4) " +
      "RETURNING communication_id::text,ticket_id::text,content,created_by::text,created_at", [id, content, actor, at])).rows[0]!;
  },
};
