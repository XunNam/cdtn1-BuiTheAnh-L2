import TicketDetailScreen from "../../../../src/components/screens/ticket-detail-screen";
import { ticketIdFromPath } from "../../../../src/lib/navigation";
import { ticketListSelection, ticketListQuery } from "../../../../src/lib/ticket-list-query";

export default async function TicketPage({ params, searchParams }: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ approval_status?: string | string[]; page?: string | string[] }>;
}) {
  const { ticketId } = await params;
  const search = await searchParams;
  const { filter, page } = ticketListSelection(search.approval_status, search.page);
  return <TicketDetailScreen id={ticketIdFromPath(ticketId)} listPath={"/tickets?" + ticketListQuery(filter, page)} />;
}
