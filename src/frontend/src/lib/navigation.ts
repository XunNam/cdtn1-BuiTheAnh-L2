import type { Role } from "./contracts.ts";

export function homePath(role: Role): string {
  return role === "NHAN_VIEN_TIEP_NHAN" ? "/intake" : "/tickets";
}

export function ticketIdFromPath(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

// Chỉ nhận route nội bộ có sẵn; không nhận URL, query hoặc mã phiếu thay cho ID.
export function returnPath(path: string | null, role: Role): string {
  if (path === "/tickets") return path;
  if (path === "/intake" && role === "NHAN_VIEN_TIEP_NHAN") return path;
  const match = path?.match(/^\/tickets\/([1-9]\d*)$/);
  if (path && match && ticketIdFromPath(match[1])) return path;
  return homePath(role);
}
