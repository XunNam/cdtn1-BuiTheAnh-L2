"use client";

import type { ReactNode } from "react";
import { ApiError } from "../../lib/api-client";
import type { useRemote } from "../../hooks/use-remote";

export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof ApiError
    ? error.message
    : "Không thể đọc dữ liệu đúng định dạng. Vui lòng thử lại.";
  return (
    <div role="alert" aria-label="Thông báo lỗi" className="error">
      <p>{message}</p>
      {error instanceof ApiError && Object.entries(error.fields).map(([field, value]) => (
        <p key={field}>{field}: {value}</p>
      ))}
      {retry && <button type="button" onClick={retry}>Thử lại</button>}
    </div>
  );
}

export function ReadState<T>({ state, children }: {
  state: ReturnType<typeof useRemote<T>>;
  children: (data: T) => ReactNode;
}) {
  if (state.loading) return <p role="status" className="notice">Đang tải dữ liệu…</p>;
  if (state.error) return <Failure error={state.error} retry={state.retry} />;
  return state.data === undefined ? null : children(state.data);
}
