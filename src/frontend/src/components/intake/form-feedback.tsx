"use client";

import { ApiError } from "../../lib/api-client";
import type { IntakeFields } from "../../lib/intake-validation";
import { Failure } from "../ui/read-state";

export function serverFields(error: unknown): IntakeFields {
  if (!(error instanceof ApiError) || error.status !== 400) return {};
  const { phone, full_name, address, serial_no, product_id, purchase_date } = error.fields;
  return { phone, full_name, address, serial_no, product_id, purchase_date };
}

export function IntakeFailure({ error, retry }: { error: unknown; retry?: () => void }) {
  // Field đã có nhãn tiếng Việt gần input; không lặp tên field nội bộ trong summary.
  return <Failure error={error instanceof ApiError ? new ApiError(error.status, error.code, error.message) : error} retry={retry} />;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="field-error">{message}</p> : null;
}

export function uncertainWrite(error: unknown): boolean {
  return error instanceof ApiError && error.code !== "STALE_REQUEST" && (error.status === 0 || error.status >= 500);
}
