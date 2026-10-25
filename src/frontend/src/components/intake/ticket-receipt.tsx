import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Ticket } from "../../lib/contracts";
import { approvalLabels, warrantyLabels } from "../../lib/labels";
import { formatTimestamp } from "../../lib/date-time";

export function TicketReceipt({ ticket, onNew }: { ticket: Ticket; onNew: () => void }) {
  const receipt = useRef<HTMLDivElement>(null);
  useEffect(() => { receipt.current?.focus(); }, []);
  return <div ref={receipt} className="ticket-receipt" data-testid="ticket-receipt" tabIndex={-1}>
    <p role="status" className="success">Đã tạo phiếu bảo hành thành công.</p>
    <h3>{ticket.ticket_code}</h3>
    <dl>
      <dt>ID phiếu</dt><dd>#{ticket.ticket_id}</dd>
      <dt>Trạng thái phiếu</dt><dd data-testid="receipt-status">{ticket.status === "MOI" ? "Mới" : ticket.status}</dd>
      <dt>Bảo hành</dt><dd data-testid="receipt-warranty">{warrantyLabels[ticket.warranty_status]}</dd>
      <dt>Phê duyệt</dt><dd data-testid="receipt-approval">{approvalLabels[ticket.approval_status]}</dd>
      <dt>Điều kiện xử lý tiếp</dt><dd>{ticket.can_proceed ? "Đủ điều kiện chuyển bước xử lý" : "Chờ quản lý phê duyệt trước khi xử lý"}</dd>
      <dt>Tiếp nhận lúc</dt><dd><time dateTime={ticket.received_at}>{formatTimestamp(ticket.received_at)}</time></dd>
      <dt>Hạn cam kết</dt><dd><time data-testid="receipt-due" dateTime={ticket.due_date}>{formatTimestamp(ticket.due_date)}</time></dd>
      <dt>Ngày đánh giá</dt><dd>{ticket.assessed_on}</dd>
      <dt>Ngày mua đã lưu</dt><dd>{ticket.purchase_date_snapshot ?? "Chưa có"}</dd>
      <dt>Tháng bảo hành đã lưu</dt><dd>{ticket.warranty_months_snapshot} tháng</dd>
      <dt>Ngày hết hạn đã lưu</dt><dd>{ticket.warranty_expires_on ?? "Chưa xác minh"}</dd>
    </dl>
    <p className="field-hint">Kết quả chính thức và hạn cam kết do máy chủ xác định khi lưu phiếu. Luồng tiếp nhận kết thúc tại đây.</p>
    <div className="intake-actions">
      <Link className="button-link" href={"/tickets/" + ticket.ticket_id}>Mở chi tiết phiếu</Link>
      <button type="button" className="secondary" onClick={onNew}>Tiếp nhận mới</button>
    </div>
  </div>;
}
