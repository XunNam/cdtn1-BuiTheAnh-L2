export type IntakeField = "phone" | "full_name" | "address" | "serial_no" | "product_id" | "purchase_date";
export type IntakeFields = Partial<Record<IntakeField, string>>;

function textIssue(value: string, label: string, min: number, max: number): string | undefined {
  if (value.includes("\0") || !value.isWellFormed()) return label + " chứa ký tự không hợp lệ.";
  const count = Array.from(value.trim()).length;
  if (count < min) return "Vui lòng nhập " + label.toLowerCase() + ".";
  if (count > max) return label + " tối đa " + max + " ký tự.";
}

// Chỉ hỗ trợ validation UX theo E01/E02; server xác nhận UNIQUE/scope/chuẩn hóa.
export function normalizeIntakePhone(raw: string): string | null {
  if (raw.includes("\0") || !raw.isWellFormed() || !raw.length || Array.from(raw).length > 30) return null;
  let value = raw.trim().replace(/[ .]/g, "");
  if (value.startsWith("+84")) value = "0" + value.slice(3);
  else if (value.startsWith("84")) value = "0" + value.slice(2);
  return /^0[0-9]{9}$/.test(value) ? value : null;
}

export function customerFields(name: string, phone: string, address: string): IntakeFields {
  return {
    full_name: textIssue(name, "Họ tên", 1, 120),
    phone: normalizeIntakePhone(phone) ? undefined : "Số điện thoại không hợp lệ.",
    address: textIssue(address, "Địa chỉ", 0, 255),
  };
}

export function serialIssue(serial: string): string | undefined {
  return textIssue(serial, "Serial / IMEI", 1, 50);
}

export function deviceFields(productId: number | null, serial: string, purchase: string): IntakeFields {
  let dateError: string | undefined;
  if (purchase) {
    const date = new Date(purchase + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchase) || purchase.startsWith("0000") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== purchase) {
      dateError = "Ngày mua không hợp lệ.";
    }
  }
  // Ngày tương lai được backend kiểm theo ngày server, không lấy ngày máy client.
  return {
    product_id: productId && Number.isSafeInteger(productId) && productId > 0 ? undefined : "Vui lòng chọn sản phẩm.",
    serial_no: serialIssue(serial),
    purchase_date: dateError,
  };
}

export function hasFieldErrors(fields: IntakeFields): boolean {
  return Object.values(fields).some(Boolean);
}
