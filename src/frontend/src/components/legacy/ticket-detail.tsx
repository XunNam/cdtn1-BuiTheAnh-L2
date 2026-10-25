"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../lib/api-client";
import type { ApiClient } from "../../lib/api-client";
import type { Principal } from "../../lib/contracts";
import { warrantyLabels, approvalLabels } from "../../lib/labels";
import { useRemote } from "../../hooks/use-remote";
import { Failure, ReadState } from "../ui/read-state";

export function TicketDetail({ api, id, principal, afterApproval }: { api: ApiClient; id: number; principal: Principal; afterApproval?: () => void }) {
  const [page, setPage] = useState(1), [content, setContent] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  const load = useCallback(() => Promise.all([api.detail(id), api.communications(id, page)]), [api, id, page]), remote = useRemote(load);
  async function write(event: FormEvent, approval: boolean) { event.preventDefault(); if (busy) return; setBusy(true); setError(undefined); try { if (approval) { await api.approve(id, note || null); afterApproval?.(); } else { await api.communicate(id, content); setContent(""); } remote.retry(); } catch (e) { setError(e); if (e instanceof ApiError && e.status === 409) remote.retry(); } finally { setBusy(false); } }
  return <section className="detail"><h2>Chi tiết phiếu #{id}</h2><ReadState state={remote}>{([ticket, messages]) => <><h3>{ticket.ticket_code}</h3><p>{ticket.customer.full_name} · {ticket.customer.phone} · Serial/IMEI: {ticket.device.serial_no}</p><p>{ticket.issue_desc}</p><dl><dt>Trạng thái phiếu</dt><dd data-testid="ticket-status">{ticket.status}</dd><dt>Tình trạng bảo hành</dt><dd>{warrantyLabels[ticket.warranty_status]}</dd><dt>Phê duyệt</dt><dd data-testid="approval-status">{approvalLabels[ticket.approval_status]}</dd><dt>Ngày mua tại tiếp nhận</dt><dd>{ticket.purchase_date_snapshot ?? "Chưa có"} · {ticket.warranty_months_snapshot} tháng</dd><dt>Tiếp nhận</dt><dd>{ticket.received_at}</dd><dt>Hạn cam kết</dt><dd data-testid="due-date">{ticket.due_date}</dd><dt>Được tiếp tục qua cổng L2</dt><dd>{ticket.can_proceed ? "Có" : "Chưa — cần quản lý phê duyệt"}</dd></dl>{ticket.approved_at && <p>Người duyệt #{ticket.approved_by} · {ticket.approved_at} · {ticket.approval_note ?? "Không ghi chú"}</p>}
      <h3>Lịch sử trao đổi</h3>{messages.data.length ? <ul>{messages.data.map(m => <li key={m.communication_id}><p>{m.content}</p><small>{m.created_at} · Người ghi #{m.created_by}</small></li>)}</ul> : <p className="empty">Phiếu chưa có trao đổi.</p>}<div className="pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trao đổi trước</button><span>{messages.meta.total} trao đổi</span><button disabled={page * 10 >= messages.meta.total} onClick={() => setPage(p => p + 1)}>Trao đổi sau</button><button onClick={remote.retry}>Tải lại chi tiết</button></div>
      {principal.role === "NHAN_VIEN_TIEP_NHAN" && <form onSubmit={e => void write(e, false)}><fieldset disabled={busy}><label>Nội dung trao đổi<textarea required value={content} onChange={e => setContent(e.target.value)} maxLength={4000} /></label><button>{busy ? "Đang lưu…" : "Lưu trao đổi"}</button></fieldset></form>}
      {principal.role === "QUAN_LY_TTBH" && (ticket.warranty_status === "CHUA_XAC_MINH" && ticket.approval_status === "CHO_PHE_DUYET" && ticket.status === "MOI" ? <form onSubmit={e => void write(e, true)}><fieldset disabled={busy}><label>Ghi chú phê duyệt (không bắt buộc)<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /></label><button>{busy ? "Đang phê duyệt…" : "Phê duyệt cho phép xử lý"}</button></fieldset></form> : <p>Phiếu đã được phê duyệt hoặc không thuộc diện cần phê duyệt.</p>)}</>}</ReadState>{error !== undefined && <Failure error={error} />}</section>;
}
