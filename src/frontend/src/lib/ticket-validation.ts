import { ApiError } from "./api-client.ts";
import type { Category, Ticket } from "./contracts.ts";

export type TicketFields = Partial<Record<"issue_desc" | "category_id" | "priority", string>>;
export type TicketPriority = Ticket["priority"];

export function ticketPriority(value: string): TicketPriority | null {
  return value === "CAO" || value === "TRUNG_BINH" || value === "THAP" ? value : null;
}

export function ticketFields(issue: string, category: string, priority: string, categories: Category[]): TicketFields {
  const count = Array.from(issue.trim()).length;
  return {
    issue_desc: issue.includes("\0") || !issue.isWellFormed() ? "Mô tả lỗi chứa ký tự không hợp lệ."
      : count === 0 ? "Vui lòng nhập mô tả lỗi." : count > 2000 ? "Mô tả lỗi tối đa 2000 ký tự." : undefined,
    category_id: categories.some(value => String(value.category_id) === category) ? undefined : "Vui lòng chọn nhóm sự cố hiện có.",
    priority: ticketPriority(priority) ? undefined : "Vui lòng chọn mức ưu tiên.",
  };
}

export function ticketServerFields(error: unknown): TicketFields {
  if (!(error instanceof ApiError) || error.status !== 400) return {};
  const fields: TicketFields = {};
  for (const key of ["issue_desc", "category_id", "priority"] as const) {
    if (error.fields[key]) fields[key] = error.fields[key];
  }
  return fields;
}

// Mất response/DTO sau POST có thể xảy ra sau commit; không suy lỗi đọc là chưa ghi.
export function uncertainTicketWrite(error: unknown): boolean {
  return !(error instanceof ApiError) || (error.code !== "STALE_REQUEST" && (error.status === 0 || error.status >= 500));
}
