import type { PoolClient } from "pg";
type DB = Pick<PoolClient, "query">;
export type CategoryRow = { category_id: number; category_name: string; is_active: boolean };
export const catalogRepository = {
  async list(db: DB): Promise<CategoryRow[]> {
    return (await db.query<CategoryRow>("SELECT category_id,category_name,is_active FROM issue_category WHERE is_active ORDER BY category_id")).rows;
  },
  async findById(db: DB, id: number): Promise<CategoryRow | undefined> {
    return (await db.query<CategoryRow>("/* l2:category-lock */ SELECT category_id,category_name,is_active FROM issue_category WHERE category_id=$1::bigint FOR SHARE", [id])).rows[0];
  },
};
