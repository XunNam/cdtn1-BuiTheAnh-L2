import * as dto from "./contracts.ts";
import type { Decoder, Customer, Device, Ticket } from "./contracts.ts";

export class ApiError extends Error {
  status: number; code: string; fields: Record<string, string>; existingCustomer?: Customer; existingDevice?: Device;
  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}, existing?: Customer, existingDevice?: Device) {
    super(message); this.status = status; this.code = code; this.fields = fields; this.existingCustomer = existing;
    this.existingDevice = existingDevice;
  }
}
export function createApiClient(options: { baseUrl: string; onUnauthorized?: () => void; timeoutMs?: number; transport?: typeof fetch }) {
  let token: string | null = null;
  let sessionVersion = 0;
  const transport = options.transport ?? fetch, base = options.baseUrl.replace(/\/$/, "");
  const single = <T>(decode: Decoder<T>): Decoder<T> => value => decode(dto.record(value).data);
  async function request<T>(path: string, decode: Decoder<T>, method = "GET", body?: unknown): Promise<T> {
    const startedInSession = sessionVersion;
    const authenticated = path !== "/auth/login";
    const stale = () => new ApiError(0, "STALE_REQUEST", "Phiên làm việc đã thay đổi. Yêu cầu cũ không còn được sử dụng.");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (authenticated && token) headers.Authorization = "Bearer " + token;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let response: Response;
    try { response = await transport(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(options.timeoutMs ?? 10000) }); }
    catch {
      if (startedInSession !== sessionVersion) throw stale();
      throw new ApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại.");
    }
    // Response từ phiên trước không được xóa token hoặc đưa dữ liệu vào phiên mới.
    if (startedInSession !== sessionVersion) throw stale();
    if (response.status === 401 && authenticated) {
      token = null;
      sessionVersion++;
      options.onUnauthorized?.();
    }
    const decodingInSession = sessionVersion;
    let json: unknown;
    try { json = await response.json(); } catch { throw new dto.ContractError(); }
    if (decodingInSession !== sessionVersion) throw stale();
    if (!response.ok) {
      const e = dto.record(dto.record(json).error), fields: Record<string, string> = {};
      if (e.fields && typeof e.fields === "object") for (const [key, value] of Object.entries(e.fields)) if (typeof value === "string") fields[key] = value;
      const existing = e.existing_customer ? dto.customer(e.existing_customer) : undefined;
      const existingDevice = response.status === 409 && e.code === "SERIAL_ALREADY_EXISTS" && e.existing_device ? dto.device(e.existing_device) : undefined;
      throw new ApiError(response.status, typeof e.code === "string" ? e.code : "API_ERROR", response.status >= 500 ? "Máy chủ đang gặp sự cố. Vui lòng thử lại." : typeof e.message === "string" ? e.message : "Không thể thực hiện yêu cầu.", fields, existing, existingDevice);
    }
    return decode(json);
  }
  return {
    setToken(value: string | null) { sessionVersion++; token = value; },
    async login(username: string, password: string) {
      const result = await request("/auth/login", single(dto.login), "POST", { username, password });
      sessionVersion++;
      token = result.access_token;
      return result;
    },
    customer: (phone: string) => request("/customers?phone=" + encodeURIComponent(phone), single(dto.customer)),
    createCustomer: (body: { full_name: string; phone: string; address?: string | null }) => request("/customers", single(dto.customer), "POST", body),
    devices: (id: number, options: { serial_no?: string; page?: number; size?: number } = {}) => {
      const query = new URLSearchParams({ page: String(options.page ?? 1), size: String(options.size ?? 20) });
      if (options.serial_no !== undefined) query.set("serial_no", options.serial_no);
      return request("/customers/" + id + "/devices?" + query, v => dto.page(v, dto.device));
    },
    createDevice: (id: number, body: { product_id: number; serial_no: string; purchase_date: string | null }) => request("/customers/" + id + "/devices", single(dto.device), "POST", body),
    products: (options: { page?: number; size?: number } = {}) => request("/products?page=" + (options.page ?? 1) + "&size=" + (options.size ?? 20), v => dto.page(v, dto.product)),
    categories: () => request("/issue-categories", single(v => dto.array(v, dto.category))),
    warranty: (id: number, assessment?: string) => request("/devices/" + id + "/warranty" + (assessment ? "?assessment_date=" + encodeURIComponent(assessment) : ""), single(dto.warranty)),
    createTicket: (body: Pick<Ticket, "customer_id" | "device_id" | "center_id" | "issue_desc" | "category_id" | "priority">) => request("/tickets", single(dto.ticket), "POST", body),
    tickets: (filter = "CHO_PHE_DUYET", page = 1) => request("/tickets?approval_status=" + encodeURIComponent(filter) + "&page=" + page + "&size=10", v => dto.page(v, dto.summary)),
    detail: (id: number) => request("/tickets/" + id, single(dto.detail)),
    approve: (id: number, note: string | null) => request("/tickets/" + id + "/warranty-approval", single(dto.approval), "POST", { note }),
    communications: (id: number, page = 1) => request("/tickets/" + id + "/communications?page=" + page + "&size=10", v => dto.page(v, dto.communication)),
    communicate: (id: number, content: string) => request("/tickets/" + id + "/communications", single(dto.communication), "POST", { content }),
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
