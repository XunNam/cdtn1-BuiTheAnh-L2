import { objectBody, text } from "./validation.ts";
import { validationError } from "./errors.ts";
import { priority } from "./domain/sla.ts";

function bodyId(input: unknown, field: string): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input <= 0)
    validationError(field, "ID phải là số nguyên dương an toàn.");
  return input;
}
export function newTicket(input: unknown) {
  const keys = ["customer_id", "device_id", "center_id", "issue_desc", "category_id", "priority"];
  const body = objectBody(input, keys, keys);
  return { customer_id: bodyId(body.customer_id, "customer_id"), device_id: bodyId(body.device_id, "device_id"),
    center_id: bodyId(body.center_id, "center_id"), category_id: bodyId(body.category_id, "category_id"),
    issue_desc: text(body.issue_desc, "issue_desc", 1, 2000), priority: priority(body.priority) };
}
export type NewTicket = ReturnType<typeof newTicket>;
export function approvalFilter(input: unknown): "CHO_PHE_DUYET" | "DA_PHE_DUYET" {
  if (input !== "CHO_PHE_DUYET" && input !== "DA_PHE_DUYET") validationError("approval_status", "Chỉ chấp nhận CHO_PHE_DUYET hoặc DA_PHE_DUYET.");
  return input;
}
export function approvalNote(input: unknown): string | null {
  const body = objectBody(input, ["note"]);
  return body.note === undefined || body.note === null ? null : text(body.note, "note", 1, 1000);
}
export function communicationContent(input: unknown): string {
  const body = objectBody(input, ["content"], ["content"]);
  return text(body.content, "content", 1, 2000);
}
