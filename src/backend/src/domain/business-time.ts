// DD04/DD06: ngày nghiệp vụ độc lập timezone của máy chạy.
export function localDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return values.year!.padStart(4, "0") + "-" + values.month + "-" + values.day;
}
export function timestamp(now: Date): string {
  return new Date(now.getTime() + 7 * 3600000).toISOString().replace("Z", "+07:00");
}
