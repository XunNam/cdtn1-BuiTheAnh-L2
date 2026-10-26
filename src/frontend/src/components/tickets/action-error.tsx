import { ApiError } from "../../lib/api-client";
import { Failure } from "../ui/read-state";

export function ActionError({ error }: { error: unknown }) {
  const value = error instanceof ApiError ? new ApiError(error.status, error.code,
    error.status === 404 ? "Không tìm thấy phiếu hoặc bạn không có quyền thực hiện." : error.message) : error;
  return <Failure error={value} />;
}
