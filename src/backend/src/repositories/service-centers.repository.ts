import type { PoolClient } from "pg";

type DB = Pick<PoolClient, "query">;
export type ServiceCenterRow = { center_id: string; center_name: string; is_active: boolean };

export const serviceCenterRepository = {
  async list(db: DB): Promise<ServiceCenterRow[]> {
    return (await db.query<ServiceCenterRow>("SELECT center_id::text,center_name,is_active FROM service_center ORDER BY center_id")).rows;
  },
  async isActive(db: DB, id: number, lock = false): Promise<boolean> {
    const result = await db.query<{ is_active: boolean }>("SELECT is_active FROM service_center WHERE center_id=$1" + (lock ? " FOR SHARE" : ""), [id]);
    return result.rows[0]?.is_active === true;
  },
};
