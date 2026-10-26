import type { ApprovalStatus, WarrantyStatus } from "./contracts";

export const statusLabels: Record<string, string> = {
  MOI: "Mới", DA_PHAN_CONG: "Đã phân công", DANG_XU_LY: "Đang xử lý", CHO_LINH_KIEN: "Chờ linh kiện",
  HOAN_TAT: "Hoàn tất", DA_DONG: "Đã đóng", DA_HUY: "Đã hủy",
};

export const priorityLabels = { CAO: "Cao", TRUNG_BINH: "Trung bình", THAP: "Thấp" };

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
