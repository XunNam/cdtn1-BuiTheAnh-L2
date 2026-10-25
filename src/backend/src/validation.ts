import { validationError } from "./errors.ts";

export function objectBody(input: unknown, allowed: readonly string[], required: readonly string[] = []): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) validationError("body", "Phải là JSON object.");
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => !allowed.includes(key))) validationError("body", "Có trường không được phép.");
  for (const key of required) if (!Object.hasOwn(body, key)) validationError(key, "Thiếu trường bắt buộc.");
  return body;
}
export function text(input: unknown, field: string, min: number, max: number, trim = true): string {
  if (typeof input !== "string") validationError(field, "Phải là chuỗi.");
  if (input.includes("\0") || !input.isWellFormed()) validationError(field, "Chuỗi Unicode không hợp lệ.");
  const value = trim ? input.trim() : input;
  const count = Array.from(value).length;
  if (count < min || count > max) validationError(field, "Độ dài không hợp lệ.");
  return value;
}
export function positiveId(input: unknown, field: string): number {
  if (typeof input !== "string" || !/^[1-9]\d*$/.test(input)) validationError(field, "ID phải là số nguyên dương.");
  const id = Number(input);
  if (!Number.isSafeInteger(id)) validationError(field, "ID vượt miền số nguyên an toàn.");
  return id;
}
export function queryValues(originalUrl: string, allowed: readonly string[]): URLSearchParams {
  const query = new URL(originalUrl, "http://localhost").searchParams;
  const seen = new Set<string>();
  for (const key of query.keys()) {
    if (!allowed.includes(key) || seen.has(key)) validationError("query", "Tham số lạ hoặc lặp.");
    seen.add(key);
  }
  return query;
}
export function pagination(query: URLSearchParams): { page: number; size: number } {
  const page = positiveId(query.get("page") ?? "1", "page");
  const size = positiveId(query.get("size") ?? "20", "size");
  if (size > 100) validationError("size", "Size từ 1 đến 100.");
  return { page, size };
}
