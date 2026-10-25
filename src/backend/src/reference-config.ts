import { readFile } from "node:fs/promises";
import type { Pool } from "pg";
import { configurationError } from "./errors.ts";
import { listReferenceIds } from "./repositories/reference.repository.ts";

export type Role = "NHAN_VIEN_TIEP_NHAN" | "QUAN_LY_TTBH";
export type Center = Readonly<{ center_id: number; center_name: string; is_active: boolean }>;
export type Product = Readonly<{ product_id: number; product_name: string; warranty_months: number; is_active: boolean }>;
export type Account = Readonly<{
  employee_id: number; username: string; role: Role; is_active: boolean;
  active_center_id: number; allowed_center_ids: readonly number[];
}>;
export type ReferenceConfig = Readonly<{
  config_version: number; centers: readonly Center[]; products: readonly Product[]; accounts: readonly Account[];
}>;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) configurationError("Config cần object.");
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) configurationError("Config sai cấu trúc.");
}
function id(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) configurationError("Config ID/version không hợp lệ.");
  return value;
}
function label(value: unknown, max = 120): string {
  if (typeof value !== "string" || value !== value.trim() || !value || !value.isWellFormed() || value.includes("\0") || Array.from(value).length > max)
    configurationError("Config nhãn/username không hợp lệ.");
  return value;
}
function active(value: unknown): boolean {
  if (typeof value !== "boolean") configurationError("Config active phải là boolean.");
  return value;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length === 0) configurationError("Config danh sách phải có dữ liệu.");
  return value;
}
function unique(values: readonly (number | string)[], kind: string) {
  if (new Set(values).size !== values.length) configurationError("Config trùng " + kind + ".");
}
export function validateReference(input: unknown): ReferenceConfig {
  const root = record(input);
  exactKeys(root, ["config_version", "centers", "products", "accounts"]);
  const centers = list(root.centers).map(raw => {
    const x = record(raw); exactKeys(x, ["center_id", "center_name", "is_active"]);
    return Object.freeze({ center_id: id(x.center_id), center_name: label(x.center_name), is_active: active(x.is_active) });
  });
  const products = list(root.products).map(raw => {
    const x = record(raw); exactKeys(x, ["product_id", "product_name", "warranty_months", "is_active"]);
    const months = x.warranty_months;
    if (typeof months !== "number" || !Number.isInteger(months) || months < 0 || months > 120) configurationError("Config warranty_months ngoài 0–120.");
    return Object.freeze({ product_id: id(x.product_id), product_name: label(x.product_name), warranty_months: months, is_active: active(x.is_active) });
  });
  unique(centers.map(x => x.center_id), "center ID"); unique(products.map(x => x.product_id), "product ID");
  const accounts = list(root.accounts).map(raw => {
    const x = record(raw); exactKeys(x, ["employee_id", "username", "role", "is_active", "active_center_id", "allowed_center_ids"]);
    if (x.role !== "NHAN_VIEN_TIEP_NHAN" && x.role !== "QUAN_LY_TTBH") configurationError("Config role không hợp lệ.");
    const allowed = list(x.allowed_center_ids).map(id);
    unique(allowed, "membership");
    const current = id(x.active_center_id), enabled = active(x.is_active);
    if (!allowed.includes(current) || allowed.some(c => !centers.some(v => v.center_id === c)))
      configurationError("Config membership/active center sai tham chiếu.");
    if (enabled && !centers.some(c => c.center_id === current && c.is_active)) configurationError("Account active cần active center hợp lệ.");
    return Object.freeze({
      employee_id: id(x.employee_id), username: label(x.username, 64), role: x.role,
      is_active: enabled, active_center_id: current, allowed_center_ids: Object.freeze(allowed),
    });
  });
  unique(accounts.map(x => x.employee_id), "employee ID"); unique(accounts.map(x => x.username), "username");
  return Object.freeze({ config_version: id(root.config_version), centers: Object.freeze(centers), products: Object.freeze(products), accounts: Object.freeze(accounts) });
}
export async function loadReference(file: string): Promise<ReferenceConfig> {
  let input: unknown;
  try { input = JSON.parse(await readFile(file, "utf8")); } catch { configurationError("Không đọc được reference config JSON."); }
  return validateReference(input);
}
export async function checkReferences(pool: Pool, config: ReferenceConfig): Promise<void> {
  // Bao gồm tombstone và actor lịch sử, không lọc active/role hiện tại.
  const rows = await listReferenceIds(pool);
  const ids = {
    center: new Set(config.centers.map(x => String(x.center_id))),
    product: new Set(config.products.map(x => String(x.product_id))),
    account: new Set(config.accounts.map(x => String(x.employee_id))),
  };
  if (rows.some(row => !Object.hasOwn(ids, row.kind) || !ids[row.kind as keyof typeof ids].has(row.ref)))
    configurationError("Config thiếu ID đang được dữ liệu nghiệp vụ hoặc lịch sử tham chiếu.");
}
