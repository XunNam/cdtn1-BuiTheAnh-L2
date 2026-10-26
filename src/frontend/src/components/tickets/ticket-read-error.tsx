import { ApiError } from "../../lib/api-client";
import { Failure } from "../ui/read-state";

export function TicketReadError({ error, retry }: { error: unknown; retry: () => void }) {
  return <Failure error={error instanceof ApiError && error.status === 404
    ? new ApiError(404, error.code, "Không tìm thấy phiếu hoặc bạn không có quyền xem.") : error} retry={retry} />;
}
