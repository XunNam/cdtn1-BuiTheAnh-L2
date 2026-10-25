"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useSession } from "../auth/session-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const main = useRef<HTMLElement>(null);
  const showShell = Boolean(session) && pathname !== "/login";

  useEffect(() => { main.current?.focus(); }, [pathname, showShell]);

  if (!session || !showShell) return <main className="auth-main">{children}</main>;
  const principal = session.principal;
  const employee = principal.role === "NHAN_VIEN_TIEP_NHAN";
  const onTickets = pathname.startsWith("/tickets");

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>
      <header className="app-header">
        <div className="brand"><strong>MEKONG / MOBILE</strong><span>Smart CRM · Bảo hành</span></div>
        <div className="session-summary">
          <span className="center-label">Trung tâm #{principal.active_center_id}</span>
          <span>{employee ? "Nhân viên tiếp nhận" : "Quản lý"} #{principal.employee_id}</span>
          <button type="button" className="secondary" onClick={() => { logout(); router.replace("/login"); }}>Đăng xuất</button>
        </div>
      </header>
      <aside className="app-sidebar">
        <div>
          <p className="nav-heading">TIẾP NHẬN</p>
          <nav aria-label="Điều hướng L2">
            <Link className="nav-link" href="/tickets" aria-current={onTickets ? "page" : undefined}>
              {employee ? "Mở phiếu bằng ID" : "Phiếu chưa xác minh"}
            </Link>
            {employee && <Link className="nav-link" href="/intake" aria-current={pathname === "/intake" ? "page" : undefined}>Tiếp nhận mới</Link>}
          </nav>
        </div>
        <p className="sidebar-center">Trung tâm hiện tại<br /><strong>Trung tâm #{principal.active_center_id}</strong></p>
      </aside>
      <div className="app-workspace">
        <main id="main-content" ref={main} tabIndex={-1}>{children}</main>
        <footer className="app-footer">Luồng L2 kết thúc ở tiếp nhận và phê duyệt ngoại lệ. Hết hạn bảo hành không đồng nghĩa được sửa miễn phí.</footer>
      </div>
    </div>
  );
}
