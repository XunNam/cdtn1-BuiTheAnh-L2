"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRemote } from "../../hooks/use-remote";
import { ApiError } from "../../lib/api-client";
import { lastTicketPage, ticketListQuery, ticketListSelection } from "../../lib/ticket-list-query";
import type { TicketListFilter } from "../../lib/ticket-list-query";
import { ticketIdFromPath } from "../../lib/navigation";
import { SessionGuard } from "../auth/session-guard";
import { useSession } from "../auth/session-provider";
import { ReadState } from "../ui/read-state";
import { TicketTable } from "../tickets/ticket-table";

export default function TicketListScreen() {
  return <SessionGuard><TicketListWorkspace /></SessionGuard>;
}

function TicketListWorkspace() {
  const { session } = useSession();
  return session?.principal.role === "QUAN_LY_TTBH" ? <ApprovalQueue /> : <OpenTicket />;
}

function OpenTicket() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    const ticketId = ticketIdFromPath(id.trim());
    setInvalid(ticketId === null);
    if (ticketId === null) input.current?.focus();
    if (ticketId) router.push("/tickets/" + ticketId);
  }
  return (
    <section>
      <h1>Mở phiếu bằng ID</h1>
      <p>Nhập ID hệ thống của phiếu cần xem. ID khác với mã phiếu BH-…</p>
      <form onSubmit={submit} method="post" noValidate>
        <label>ID phiếu<input ref={input} inputMode="numeric" required value={id} onChange={event => { setId(event.target.value); setInvalid(false); }} aria-invalid={invalid} aria-describedby={invalid ? "ticket-id-error" : undefined} /></label>
        {invalid && <p id="ticket-id-error" role="alert" className="error">Vui lòng nhập ID là số nguyên dương hợp lệ.</p>}
        <button type="submit">Mở phiếu</button>
      </form>
      <Link href="/intake">← Tiếp nhận mới</Link>
    </section>
  );
}

function ApprovalQueue() {
  const { api } = useSession();
  const search = useSearchParams();
  const router = useRouter();
  const { filter, page } = ticketListSelection(search.get("approval_status"), search.get("page"));
  const navigate = useCallback((value: TicketListFilter, number: number) => router.replace("/tickets?" + ticketListQuery(value, number), { scroll: false }), [router]);
  const load = useCallback(async () => {
    const value = await api.tickets(filter, page);
    let otherTotal: number | null = null;
    if (value.meta.total === 0 && page === 1) {
      try { otherTotal = (await api.tickets(filter === "CHO_PHE_DUYET" ? "DA_PHE_DUYET" : "CHO_PHE_DUYET", 1, 1)).meta.total; }
      catch (error) { if (error instanceof ApiError && (error.status === 401 || error.code === "STALE_REQUEST")) throw error; }
    }
    return { ...value, otherTotal };
  }, [api, filter, page]);
  const remote = useRemote(load);
  useEffect(() => {
    if (remote.data && page > lastTicketPage(remote.data.meta.total, remote.data.meta.size)) navigate(filter, lastTicketPage(remote.data.meta.total, remote.data.meta.size));
  }, [remote.data, page, filter, navigate]);

  return (
    <section>
      <h1>Phiếu chưa xác minh bảo hành</h1>
      <p>Chỉ gồm phiếu chưa xác minh bảo hành của các trung tâm được phép. Danh sách xếp theo tiếp nhận cũ trước.</p>
      <label>Kết quả phê duyệt<select aria-label="Kết quả phê duyệt" value={filter} onChange={event => navigate(ticketListSelection(event.target.value, "1").filter, 1)}>
        <option value="CHO_PHE_DUYET">Chờ phê duyệt</option>
        <option value="DA_PHE_DUYET">Đã phê duyệt</option>
      </select></label>
      <ReadState state={remote}>{value => <>
        {page > lastTicketPage(value.meta.total, value.meta.size) ? <p role="status" className="notice">Đang chuyển về trang phiếu hợp lệ…</p>
          : value.data.length === 0 ? <p className="empty">{value.meta.total > 0 ? "Không có phiếu ở trang này. Hãy làm mới danh sách."
            : value.otherTotal === 0 ? "Chưa có phiếu chưa xác minh bảo hành trong phạm vi của bạn."
              : value.otherTotal === null ? "Không có phiếu theo lựa chọn hiện tại." : "Không có phiếu phù hợp với lựa chọn hiện tại."}</p>
            : <TicketTable tickets={value.data} filter={filter} page={page} />}
        <div className="pagination" aria-label="Phân trang phiếu">
          <button type="button" className="secondary" disabled={page === 1} onClick={() => navigate(filter, page - 1)}>Trang trước</button>
          <span>Trang {page} · {value.meta.total} phiếu</span>
          <button type="button" className="secondary" disabled={page * value.meta.size >= value.meta.total} onClick={() => navigate(filter, page + 1)}>Trang sau</button>
          <button type="button" className="secondary" onClick={remote.retry}>Làm mới danh sách</button>
        </div>
      </>}</ReadState>
    </section>
  );
}
