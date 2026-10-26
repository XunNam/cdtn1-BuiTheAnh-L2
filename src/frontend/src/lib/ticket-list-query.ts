import { ticketIdFromPath } from "./navigation.ts";

export type TicketListFilter = "CHO_PHE_DUYET" | "DA_PHE_DUYET";

export function ticketListSelection(filter: unknown, page: unknown) {
  const selectedFilter: TicketListFilter = filter === "DA_PHE_DUYET" ? "DA_PHE_DUYET" : "CHO_PHE_DUYET";
  return {
    filter: selectedFilter,
    page: typeof page === "string" ? ticketIdFromPath(page) ?? 1 : 1,
  };
}

export function ticketListQuery(filter: TicketListFilter, page: number): string {
  return new URLSearchParams({ approval_status: filter, page: String(page) }).toString();
}

export function lastTicketPage(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}
