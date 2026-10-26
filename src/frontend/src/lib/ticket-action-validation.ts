import { ApiError } from "./api-client.ts";
import { ContractError } from "./contracts.ts";
import type { Approval, Detail } from "./contracts.ts";

export function actionTextIssue(raw: string, kind: "content" | "note"): string | undefined {
  const label = kind === "content" ? "Nội dung trao đổi" : "Ghi chú phê duyệt";
  const count = Array.from(raw.trim()).length, max = kind === "content" ? 2000 : 1000;
  if (raw.includes("\0") || !raw.isWellFormed()) return label + " chứa ký tự không hợp lệ.";
  if (kind === "content" && count === 0) return "Vui lòng nhập nội dung trao đổi.";
  if (count > max) return label + " tối đa " + max + " ký tự.";
}

export function approvalApplicable(ticket: Pick<Detail, "status" | "warranty_status" | "approval_status">): boolean {
  return ticket.status === "MOI" && ticket.warranty_status === "CHUA_XAC_MINH" && ticket.approval_status === "CHO_PHE_DUYET";
}

export function checkedApproval(value: Approval, id: number): Approval {
  if (value.ticket_id !== id || value.status !== "MOI" || value.warranty_status !== "CHUA_XAC_MINH" || value.approval_status !== "DA_PHE_DUYET" || value.approved_by === null || value.approved_at === null || !value.can_proceed) throw new ContractError();
  return value;
}

export function actionFieldIssue(error: unknown, field: "content" | "note"): string | undefined {
  return error instanceof ApiError && error.status === 400 ? error.fields[field] : undefined;
}

export function uncertainAction(error: unknown): boolean {
  return !(error instanceof ApiError) || (error.code !== "STALE_REQUEST" && (error.status === 0 || error.status >= 500));
}
