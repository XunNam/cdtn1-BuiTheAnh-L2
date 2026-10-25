"use client";

import { useRef, useState } from "react";
import type { Customer, Device, Ticket } from "../../lib/contracts";
import { SessionGuard } from "../auth/session-guard";
import { useSession } from "../auth/session-provider";
import { ClassificationForm } from "../intake/classification-form";
import { TicketReceipt } from "../intake/ticket-receipt";
import { CustomerSection } from "../intake/customer-section";
import { DeviceSection } from "../intake/device-section";

export default function IntakeScreen() {
  return <SessionGuard role="NHAN_VIEN_TIEP_NHAN"><IntakeWorkspace /></SessionGuard>;
}

function IntakeWorkspace() {
  const { api, session } = useSession();
  const [selection, setSelection] = useState<{ customer: Customer | null; device: Device | null; version: number }>({ customer: null, device: null, version: 0 });
  const [phase, setPhase] = useState<"draft" | "submitting" | "uncertain" | "created">("draft");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const locked = useRef(false);
  const revision = useRef(0);
  const { customer, device, version } = selection;

  function selectCustomer(customer: Customer | null) {
    if (locked.current) return;
    setSelection({ customer, device: null, version: ++revision.current });
  }

  function selectDevice(device: Device | null) {
    if (locked.current) return;
    setSelection({ customer, device, version: ++revision.current });
  }

  function reset() {
    locked.current = false;
    setPhase("draft");
    setTicket(null);
    setDraftVersion(value => value + 1);
    setSelection({ customer: null, device: null, version: ++revision.current });
  }

  if (!session) return null;
  return (
    <>
      <div className="page-heading">
        <h1>Tiếp nhận yêu cầu bảo hành</h1>
        <p>Tra cứu khách hàng, ghi nhận thiết bị và phân loại yêu cầu trước khi tạo phiếu.</p>
      </div>
      <div className="intake-grid">
        <fieldset className="intake-selection" disabled={phase !== "draft"}>
          <legend className="visually-hidden">Khách hàng và thiết bị</legend>
          <CustomerSection key={draftVersion} api={api} customer={customer} onCustomer={selectCustomer} />
          {customer ? <DeviceSection key={customer.customer_id} api={api} customer={customer} selected={device} onSelect={selectDevice} />
            : <section><h2>02 · Thiết bị</h2><p className="empty">Chọn khách hàng để xem thiết bị.</p></section>}
        </fieldset>
        <section className="intake-classification">
          <h2>Tiếp nhận & tạo phiếu</h2>
          {ticket ? <TicketReceipt ticket={ticket} onNew={reset} /> : customer && device ? <ClassificationForm key={version} api={api} customer={customer} device={device} principal={session.principal}
            onPhase={next => { if (revision.current === version) { locked.current = next !== "draft"; setPhase(next); } }}
            onCreated={value => { if (revision.current === version) { locked.current = true; setTicket(value); setPhase("created"); } }}
            onCancel={reset} />
            : <p className="empty">Chọn khách hàng và thiết bị để tiếp tục phân loại.</p>}
        </section>
      </div>
    </>
  );
}
