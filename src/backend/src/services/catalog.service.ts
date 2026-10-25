import type { Pool } from "pg";
import type { Principal } from "../auth.ts";
import { requireRole } from "../auth.ts";
import type { ReferenceConfig } from "../reference-config.ts";
import { validateReference } from "../reference-config.ts";
import { configurationError } from "../errors.ts";
import { catalogRepository } from "../repositories/catalog.repository.ts";

const labels: Readonly<Record<string, string>> = {
  MAN_HINH: "Màn hình", PIN: "Pin", SAC: "Sạc", PHAN_MEM: "Phần mềm", NUOC_VAO: "Nước vào", KHAC: "Khác",
};
export function categoryLabel(code: string): string {
  if (!Object.hasOwn(labels, code)) configurationError("Danh mục nhóm sự cố không hợp lệ.");
  return labels[code]!;
}
export function createCatalogService(pool: Pool, config: ReferenceConfig, categories = catalogRepository) {
  const reference = validateReference(config);
  return {
    products(principal: Principal, page: number, size: number) {
      requireRole(principal, ["NHAN_VIEN_TIEP_NHAN"]);
      const active = reference.products.filter(p => p.is_active).sort((a, b) => a.product_id - b.product_id);
      const start = BigInt(page - 1) * BigInt(size);
      const items = start >= BigInt(active.length) ? [] : active.slice(Number(start), Number(start) + size);
      return { data: items.map(p => ({ product_id: p.product_id, product_name: p.product_name, warranty_months: p.warranty_months })),
        meta: { page, size, total: active.length } };
    },
    async categories(principal: Principal) {
      requireRole(principal, ["NHAN_VIEN_TIEP_NHAN"]);
      return { data: (await categories.list(pool)).map(c => ({ category_id: c.category_id, category_name: categoryLabel(c.category_name) })) };
    },
  };
}
export type CatalogService = ReturnType<typeof createCatalogService>;
