"use client";

import Link from "next/link";
import { SessionGuard } from "../auth/session-guard";
import { useSession } from "../auth/session-provider";
import { TicketDetail } from "../tickets/ticket-detail";

export default function TicketDetailScreen({ id, listPath }: { id: number | null; listPath: string }) {
  return <SessionGuard><DetailWorkspace id={id} listPath={listPath} /></SessionGuard>;
}

function DetailWorkspace({ id, listPath }: { id: number | null; listPath: string }) {
  const { api, session } = useSession();
  if (!session) return null;
  const manager = session.principal.role === "QUAN_LY_TTBH";
  return (
    <>
      <div className="page-heading detail-heading">
        <h1>Chi tiết phiếu bảo hành</h1>
        <Link className="button-link secondary" href={manager ? listPath : "/intake"}>{manager ? "← Danh sách" : "← Tiếp nhận mới"}</Link>
      </div>
      {id === null ? <section><p role="alert" className="error">ID phiếu không hợp lệ.</p></section>
        : <TicketDetail key={id} api={api} id={id} principal={session.principal} />}
    </>
  );
}
