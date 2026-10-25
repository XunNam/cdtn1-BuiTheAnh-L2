const timestampFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

// Chỉ định dạng timestamp đã decode; giữ ISO gốc để đối chiếu, không tính lại SLA.
export function formatTimestamp(value: string): string {
  const parts = timestampFormat.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}
