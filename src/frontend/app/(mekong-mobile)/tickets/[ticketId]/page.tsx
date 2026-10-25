import TicketDetailScreen from "../../../../src/components/screens/ticket-detail-screen";
import { ticketIdFromPath } from "../../../../src/lib/navigation";

export default async function TicketPage({ params, searchParams }: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ approval_status?: string; page?: string }>;
}) {
  const { ticketId } = await params;
  const search = await searchParams;
  const filter = search.approval_status === "DA_PHE_DUYET" ? "DA_PHE_DUYET" : "CHO_PHE_DUYET";
  const page = ticketIdFromPath(search.page ?? "1") ?? 1;
  return <TicketDetailScreen id={ticketIdFromPath(ticketId)} listPath={"/tickets?approval_status=" + filter + "&page=" + page} />;
}
