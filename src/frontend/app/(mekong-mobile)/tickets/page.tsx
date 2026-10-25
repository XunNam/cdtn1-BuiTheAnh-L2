import { Suspense } from "react";
import TicketListScreen from "../../../src/components/screens/ticket-list-screen";

export default function TicketsPage() {
  return <Suspense fallback={<p role="status" className="notice">Đang mở danh sách…</p>}><TicketListScreen /></Suspense>;
}
