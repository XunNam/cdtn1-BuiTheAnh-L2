"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useRemote } from "../../hooks/use-remote";
import { warrantyLabels, approvalLabels } from "../../lib/labels";
import { ticketIdFromPath } from "../../lib/navigation";
import { SessionGuard } from "../auth/session-guard";
import { useSession } from "../auth/session-provider";
import { ReadState } from "../ui/read-state";

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
  function submit(event: FormEvent) {
    event.preventDefault();
    const ticketId = ticketIdFromPath(id.trim());
    setInvalid(ticketId === null);
    if (ticketId) router.push("/tickets/" + ticketId);
  }
  return (
    <section>
      <h1>Mở phiếu bằng ID</h1>
      <p>Nhập ID hệ thống của phiếu cần xem. ID khác với mã phiếu BH-…</p>
      <form onSubmit={submit}>
        <label>ID phiếu<input inputMode="numeric" required value={id} onChange={event => { setId(event.target.value); setInvalid(false); }} aria-invalid={invalid} aria-describedby={invalid ? "ticket-id-error" : undefined} /></label>
        {invalid && <p id="ticket-id-error" role="alert" className="error">Vui lòng nhập ID là số nguyên dương hợp lệ.</p>}
        <button type="submit">Mở phiếu</button>
      </form>
    </section>
  );
}

function ApprovalQueue() {
  const { api } = useSession();
  const search = useSearchParams();
  const router = useRouter();
  const filter = search.get("approval_status") === "DA_PHE_DUYET" ? "DA_PHE_DUYET" : "CHO_PHE_DUYET";
  const requestedPage = ticketIdFromPath(search.get("page") ?? "1");
  const page = requestedPage ?? 1;
  const query = (value: string, number: number) => "approval_status=" + value + "&page=" + number;
  const navigate = (value: string, number: number) => router.replace("/tickets?" + query(value, number), { scroll: false });
  const load = useCallback(() => api.tickets(filter, page), [api, filter, page]);
  const remote = useRemote(load);

  return (
    <section>
      <h1>Phiếu chưa xác minh bảo hành</h1>
      <p>Xem phiếu chờ phê duyệt hoặc đã phê duyệt trong phạm vi của bạn.</p>
      <label>Kết quả phê duyệt<select aria-label="Kết quả phê duyệt" value={filter} onChange={event => navigate(event.target.value, 1)}>
        <option value="CHO_PHE_DUYET">Chờ phê duyệt</option>
        <option value="DA_PHE_DUYET">Đã phê duyệt</option>
      </select></label>
      <ReadState state={remote}>{value => <>
        {value.data.length === 0 ? <p className="empty">{filter === "CHO_PHE_DUYET" ? "Không có phiếu chờ phê duyệt trong phạm vi của bạn." : "Không có phiếu phù hợp bộ lọc đã phê duyệt."}</p> : (
          <div className="table-wrap"><table>
            <caption>Phiếu chưa xác minh · Tiếp nhận cũ trước</caption>
            <thead><tr><th scope="col">Mã phiếu</th><th scope="col">Trung tâm</th><th scope="col">Bảo hành / Phê duyệt</th><th scope="col">Hạn cam kết</th><th scope="col">Thao tác</th></tr></thead>
            <tbody>{value.data.map(ticket => <tr key={ticket.ticket_id}>
              <td>{ticket.ticket_code}</td><td>#{ticket.center_id}</td>
              <td>{warrantyLabels[ticket.warranty_status]} · {approvalLabels[ticket.approval_status]}</td>
              <td>{ticket.due_date}</td>
              <td><Link className="button-link secondary" href={"/tickets/" + ticket.ticket_id + "?" + query(filter, page)}>Xem phiếu {ticket.ticket_code}</Link></td>
            </tr>)}</tbody>
          </table></div>
        )}
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
