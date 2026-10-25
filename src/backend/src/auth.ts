import { createHash, randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import type { Account, ReferenceConfig, Role } from "./reference-config.ts";
import type { Credential } from "./credentials.ts";
import { verifyPassword } from "./credentials.ts";
import { AppError, configurationError } from "./errors.ts";

export type Principal = Readonly<Pick<Account, "employee_id" | "role" | "active_center_id" | "allowed_center_ids">>;
declare global { namespace Express { interface Request { principal?: Principal } } }
type Session = { employeeId: number; expires: number };
export function createAuth(
  config: ReferenceConfig, credentials: readonly Credential[],
  options: { ttlSeconds: number; maxSessions: number; now?: () => number },
) {
  if (!Number.isSafeInteger(options.ttlSeconds) || options.ttlSeconds <= 0 || !Number.isSafeInteger(options.maxSessions) || options.maxSessions <= 0 || options.maxSessions > 100)
    configurationError("AUTH TTL/cap không hợp lệ.");
  const now = options.now ?? Date.now;
  const sessions = new Map<string, Session>();
  const digest = (token: string) => createHash("sha256").update(token).digest("hex");
  const sweep = () => { const time = now(); for (const [key, session] of sessions) if (time >= session.expires) sessions.delete(key); };
  const timer = setInterval(sweep, 60000); timer.unref();
  function principalFor(employeeId: number): Principal | undefined {
    const a = config.accounts.find(x => x.employee_id === employeeId);
    if (!a?.is_active || !a.allowed_center_ids.includes(a.active_center_id)
      || !config.centers.some(c => c.center_id === a.active_center_id && c.is_active)) return undefined;
    return Object.freeze({ employee_id: a.employee_id, role: a.role, active_center_id: a.active_center_id, allowed_center_ids: a.allowed_center_ids });
  }
  async function login(username: string, password: string) {
    const account = config.accounts.find(x => x.username === username);
    // Dùng một hash hợp lệ làm dummy khi không có username; không báo khác lỗi credential.
    const credential = credentials.find(x => x.employee_id === account?.employee_id) ?? credentials[0];
    const validPassword = credential ? await verifyPassword(password, credential) : false;
    const principal = account ? principalFor(account.employee_id) : undefined;
    if (!account || !validPassword || !principal) throw new AppError("INVALID_CREDENTIALS", "Thông tin đăng nhập không hợp lệ.");
    // Không await từ kiểm cap tới Map.set: ngăn login đồng thời vượt cap trong một process.
    sweep();
    if (sessions.size >= options.maxSessions) throw new AppError("AUTH_CAPACITY_REACHED", "Đã đạt giới hạn phiên đăng nhập.");
    let token: string, key: string;
    do { token = randomBytes(32).toString("base64url"); key = digest(token); } while (sessions.has(key));
    const expires = now() + options.ttlSeconds * 1000;
    sessions.set(key, { employeeId: account.employee_id, expires });
    return {
      access_token: token, token_type: "Bearer", expires_in: options.ttlSeconds,
      expires_at: new Date(expires + 7 * 3600000).toISOString().replace("Z", "+07:00"), principal,
    };
  }
  function authenticate(header: string | undefined): Principal {
    sweep();
    const match = header?.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
    const key = match ? digest(match[1]!) : undefined;
    const session = key ? sessions.get(key) : undefined;
    const principal = session ? principalFor(session.employeeId) : undefined;
    if (!session || !principal) {
      if (key) sessions.delete(key);
      throw new AppError("AUTHENTICATION_REQUIRED", "Cần đăng nhập hợp lệ.");
    }
    return principal;
  }
  const requireAuth: RequestHandler = (req, _res, next) => {
    try { req.principal = authenticate(req.get("authorization")); next(); } catch (error) { next(error); }
  };
  return { login, authenticate, requireAuth, sweep, sessionCount: () => sessions.size, close: () => { clearInterval(timer); sessions.clear(); } };
}
export type Auth = ReturnType<typeof createAuth>;
export function requireRole(principal: Principal, roles: readonly Role[]): void {
  if (!roles.includes(principal.role)) throw new AppError("ROLE_FORBIDDEN", "Vai trò không được phép.");
}
export function canAccessCenter(principal: Principal, centerId: number): boolean {
  return principal.role === "NHAN_VIEN_TIEP_NHAN"
    ? principal.active_center_id === centerId && principal.allowed_center_ids.includes(centerId)
    : principal.allowed_center_ids.includes(centerId);
}
export function requireResourceScope(principal: Principal, centerId: number): void {
  if (!canAccessCenter(principal, centerId)) throw new AppError("RESOURCE_NOT_FOUND", "Không tìm thấy tài nguyên trong phạm vi.");
}
export function requireCreateCenter(principal: Principal, centerId: number): void {
  if (principal.active_center_id !== centerId || !principal.allowed_center_ids.includes(centerId))
    throw new AppError("ROLE_FORBIDDEN", "Trung tâm không thuộc phạm vi thao tác.");
}
