import type { ApprovalStatus, WarrantyStatus } from "./contracts";

export const warrantyLabels: Record<WarrantyStatus, string> = {
  CON_BAO_HANH: "Còn bảo hành",
  HET_BAO_HANH: "Hết bảo hành",
  CHUA_XAC_MINH: "Chưa xác minh bảo hành",
};

export const approvalLabels: Record<ApprovalStatus, string> = {
  KHONG_CAN: "Không cần phê duyệt",
  CHO_PHE_DUYET: "Chờ phê duyệt",
  DA_PHE_DUYET: "Đã phê duyệt",
};
