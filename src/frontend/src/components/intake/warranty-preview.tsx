import type { Warranty } from "../../lib/contracts";
import { warrantyLabels } from "../../lib/labels";

export function WarrantyPreview({ value }: { value: Warranty }) {
  return <div className="warranty-preview" data-testid="warranty-preview">
    <p className="notice"><strong>{warrantyLabels[value.warranty_status]}</strong></p>
    <dl>
      <dt>Ngày đánh giá</dt><dd>{value.assessed_on}</dd>
      <dt>Ngày mua</dt><dd>{value.purchase_date ?? "Chưa có"}</dd>
      <dt>Tháng bảo hành</dt><dd>{value.warranty_months} tháng</dd>
      <dt>Ngày hết hạn</dt><dd>{value.warranty_expires_on ?? "Chưa xác minh"}</dd>
    </dl>
    {value.requires_approval && <p>Thiếu ngày mua: tạo phiếu Mới và chờ quản lý phê duyệt.</p>}
    {value.warranty_status === "HET_BAO_HANH" && <p>Vẫn có thể tiếp nhận yêu cầu. Hết bảo hành không đồng nghĩa được sửa chữa miễn phí.</p>}
    <p className="field-hint">Kết quả xem trước từ máy chủ; hệ thống kiểm tra lại khi tạo phiếu.</p>
  </div>;
}
