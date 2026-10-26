"use client";

import type { ApiClient } from "../../lib/api-client";
import type { Detail, Principal } from "../../lib/contracts";
import { useTicketRecord } from "../../hooks/use-ticket-record";
import { useCommunicationHistory } from "../../hooks/use-communication-history";
import { CommunicationHistory } from "./communication-history";
import { CommunicationForm } from "./communication-form";
import { ApprovalForm } from "./approval-form";
import { ApprovalInformation, TicketInformation, TicketSnapshot, TicketStates } from "./ticket-information";
import { TicketReadError } from "./ticket-read-error";

export function TicketDetail({ api, id, principal }: { api: ApiClient; id: number; principal: Principal }) {
  const record = useTicketRecord(api, id);
  return <div className="detail">
    {!record.data ? record.loading ? <p role="status" className="notice">Đang tải chi tiết phiếu…</p>
      : record.error !== undefined ? <TicketReadError error={record.error} retry={() => void record.refresh().catch(() => {})} /> : null
      : <>
        {record.error !== undefined && <TicketReadError error={record.error} retry={() => void record.refresh().catch(() => {})} />}
        <LoadedTicket api={api} ticket={record.data} principal={principal} record={record} />
        <button type="button" className="secondary" disabled={record.loading} onClick={() => void record.refresh().catch(() => {})}>{record.loading ? "Đang tải lại chi tiết…" : "Tải lại chi tiết"}</button>
      </>}
  </div>;
}

function LoadedTicket({ api, ticket, principal, record }: {
  api: ApiClient; ticket: Detail; principal: Principal; record: ReturnType<typeof useTicketRecord>;
}) {
  const history = useCommunicationHistory(api, ticket.ticket_id);
  return <>
    <div className="detail-title"><p>ID phiếu #{ticket.ticket_id}</p><h3 data-testid="ticket-code">{ticket.ticket_code}</h3><TicketStates ticket={ticket} /></div>
    <div className="ticket-detail-grid">
      <div><TicketInformation ticket={ticket} /><CommunicationHistory history={history} />
        {principal.role === "NHAN_VIEN_TIEP_NHAN" && <CommunicationForm api={api} id={ticket.ticket_id} onReadHistory={history.refreshLast} />}
      </div>
      <div><TicketSnapshot ticket={ticket} /><ApprovalInformation ticket={ticket} />
        {principal.role === "QUAN_LY_TTBH" && <ApprovalForm api={api} ticket={ticket} onApproved={record.applyApproval} onReload={record.refresh} />}
      </div>
    </div>
  </>;
}
