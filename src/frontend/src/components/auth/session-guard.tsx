"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { Role } from "../../lib/contracts";
import { homePath } from "../../lib/navigation";
import { useSession } from "./session-provider";

export function SessionGuard({ role, children }: { role?: Role; children: ReactNode }) {
  const { session, rememberPath } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      rememberPath(pathname);
      router.replace("/login");
    }
  }, [session, pathname, router, rememberPath]);

  if (!session) return <p role="status" className="notice">Đang chuyển đến đăng nhập…</p>;
  if (role && session.principal.role !== role) {
    return (
      <section>
        <h1>Không đủ quyền truy cập</h1>
        <p role="alert">Vai trò hiện tại không được thực hiện thao tác này.</p>
        <Link className="button-link" href={homePath(session.principal.role)}>Về màn hình chính</Link>
      </section>
    );
  }
  return children;
}
