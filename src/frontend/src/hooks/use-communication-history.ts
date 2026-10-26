"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import type { ApiClient } from "../lib/api-client";
import { ContractError } from "../lib/contracts";
import type { Communication, Page } from "../lib/contracts";
import { lastTicketPage } from "../lib/ticket-list-query";

export function useCommunicationHistory(api: ApiClient, id: number) {
  const [state, setState] = useState<{ page: number; loading: boolean; data?: Page<Communication>; error?: unknown }>({ page: 1, loading: true });
  const generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const read = useCallback(async (page: number, last = false) => {
    const version = ++generation.current;
    let target = page;
    setState({ page, loading: true });
    try {
      let value = await api.communications(id, page);
      if (generation.current !== version) throw new ApiError(0, "STALE_REQUEST", "Yêu cầu cũ không còn được sử dụng.");
      const finalPage = lastTicketPage(value.meta.total, value.meta.size);
      if ((last && target !== finalPage) || target > finalPage) {
        target = finalPage;
        value = await api.communications(id, target);
      }
      if (generation.current !== version) throw new ApiError(0, "STALE_REQUEST", "Yêu cầu cũ không còn được sử dụng.");
      if (value.data.some(message => message.ticket_id !== id)) throw new ContractError();
      setState({ page: value.meta.page, loading: false, data: value });
      return value;
    } catch (error) {
      if (generation.current === version) setState({ page: target, loading: false, error });
      throw error;
    }
  }, [api, id]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void read(1).catch(() => {}); });
    return () => { active = false; invalidate(); };
  }, [read, invalidate]);
  return { ...state, read, refreshLast: () => read(1, true) };
}
