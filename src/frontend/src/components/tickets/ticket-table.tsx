import Link from "next/link";
import type { TicketSummary } from "../../lib/contracts";
import type { TicketListFilter } from "../../lib/ticket-list-query";
import { ticketListQuery } from "../../lib/ticket-list-query";
import { formatTimestamp } from "../../lib/date-time";
import { approvalLabels, statusLabels, warrantyLabels } from "../../lib/labels";

export function TicketTable({ tickets, filter, page }: { tickets: TicketSummary[]; filter: TicketListFilter; page: number }) {
  return <>
    <p id="ticket-table-hint" className="field-hint table-hint">Bảng rộng: cuộn ngang để xem đủ cột. Khi dùng bàn phím, đặt focus vào bảng rồi dùng phím mũi tên.</p>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Bảng phiếu chưa xác minh" aria-describedby="ticket-table-hint">
    <table className="ticket-table">
      <caption>Phiếu chưa xác minh · Tiếp nhận cũ trước; cùng thời điểm xếp theo ID tăng dần</caption>
      <thead><tr><th scope="col">Mã phiếu</th><th scope="col">Trung tâm</th><th scope="col">Trạng thái phiếu</th><th scope="col">Bảo hành</th><th scope="col">Phê duyệt</th><th scope="col">Tiếp nhận</th><th scope="col">Hạn cam kết</th><th scope="col">Thao tác</th></tr></thead>
      <tbody>{tickets.map(ticket => <tr key={ticket.ticket_id} data-ticket-id={ticket.ticket_id}>
        <td>{ticket.ticket_code}</td><td>#{ticket.center_id}</td><td>{statusLabels[ticket.status]}</td>
        <td>{warrantyLabels[ticket.warranty_status]}</td><td>{approvalLabels[ticket.approval_status]}</td>
        <td><time dateTime={ticket.received_at}>{formatTimestamp(ticket.received_at)}</time></td>
        <td><time dateTime={ticket.due_date}>{formatTimestamp(ticket.due_date)}</time></td>
        <td><Link className="button-link secondary" href={"/tickets/" + ticket.ticket_id + "?" + ticketListQuery(filter, page)}>Xem phiếu {ticket.ticket_code}</Link></td>
      </tr>)}</tbody>
    </table>
  </div></>;
}
