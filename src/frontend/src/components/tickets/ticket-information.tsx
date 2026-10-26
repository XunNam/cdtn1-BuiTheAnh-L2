import type { Detail } from "../../lib/contracts";
import { formatTimestamp } from "../../lib/date-time";
import { approvalLabels, priorityLabels, statusLabels, warrantyLabels } from "../../lib/labels";

export function TicketStates({ ticket }: { ticket: Detail }) {
  return <dl className="ticket-states">
    <div><dt>Trạng thái phiếu</dt><dd data-testid="ticket-status" data-value={ticket.status}>{statusLabels[ticket.status]}</dd></div>
    <div><dt>Bảo hành</dt><dd>{warrantyLabels[ticket.warranty_status]}</dd></div>
    <div><dt>Phê duyệt</dt><dd data-testid="approval-status">{approvalLabels[ticket.approval_status]}</dd></div>
  </dl>;
}

export function TicketInformation({ ticket }: { ticket: Detail }) {
  return <section className="ticket-information">
    <h2>Thông tin tiếp nhận</h2>
    <dl>
      <dt>Khách hàng</dt><dd>{ticket.customer.full_name} · ID #{ticket.customer.customer_id}</dd>
      <dt>Số điện thoại</dt><dd data-testid="ticket-phone">{ticket.customer.phone}</dd>
      <dt>Serial/IMEI</dt><dd>{ticket.device.serial_no} · ID thiết bị #{ticket.device.device_id}</dd>
      <dt>Sản phẩm</dt><dd>#{ticket.device.product_id}</dd>
      <dt>Trung tâm</dt><dd>#{ticket.center_id}</dd>
      <dt>Nhóm sự cố</dt><dd>#{ticket.category_id}</dd>
      <dt>Mức ưu tiên</dt><dd>{priorityLabels[ticket.priority]}</dd>
    </dl>
    <h3>Mô tả lỗi</h3><p className="preserve-lines">{ticket.issue_desc}</p>
  </section>;
}

export function TicketSnapshot({ ticket }: { ticket: Detail }) {
  return <section className="ticket-snapshot">
    <h2>Bảo hành và cam kết</h2>
    <p className="field-hint">Kết quả tại thời điểm tiếp nhận, được lưu cùng phiếu.</p>
    <dl>
      <dt>Ngày đánh giá</dt><dd>{ticket.assessed_on}</dd>
      <dt>Ngày mua tại tiếp nhận</dt><dd>{ticket.purchase_date_snapshot ?? "Chưa có"}</dd>
      <dt>Tháng bảo hành</dt><dd>{ticket.warranty_months_snapshot} tháng</dd>
      <dt>Ngày hết hạn</dt><dd>{ticket.warranty_expires_on ?? "Chưa xác minh"}</dd>
      <dt>Tiếp nhận lúc</dt><dd><time dateTime={ticket.received_at}>{formatTimestamp(ticket.received_at)}</time></dd>
      <dt>Hạn cam kết</dt><dd><time data-testid="due-date" dateTime={ticket.due_date}>{formatTimestamp(ticket.due_date)}</time></dd>
      <dt>Điều kiện xử lý tiếp</dt><dd>{ticket.can_proceed ? "Đủ điều kiện chuyển bước xử lý" : "Chờ quản lý phê duyệt trước khi xử lý"}</dd>
    </dl>
  </section>;
}

export function ApprovalInformation({ ticket }: { ticket: Detail }) {
  return <section className="approval-information">
    <h2>Kết quả phê duyệt</h2>
    <p>{approvalLabels[ticket.approval_status]}</p>
    {ticket.approved_at && <dl>
      <dt>Người duyệt</dt><dd>#{ticket.approved_by}</dd>
      <dt>Thời điểm</dt><dd><time dateTime={ticket.approved_at}>{formatTimestamp(ticket.approved_at)}</time></dd>
      <dt>Ghi chú</dt><dd className="preserve-lines">{ticket.approval_note ?? "Không ghi chú"}</dd>
    </dl>}
  </section>;
}
