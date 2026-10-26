"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import type { ApiClient } from "../lib/api-client";
import { ContractError } from "../lib/contracts";
import type { Approval, Detail } from "../lib/contracts";

export function useTicketRecord(api: ApiClient, id: number) {
  const [state, setState] = useState<{ data?: Detail; loading: boolean; error?: unknown }>({ loading: true });
  const generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setState(value => ({ ...value, loading: true, error: undefined }));
    try {
      const value = await api.detail(id);
      if (generation.current !== version) throw new ApiError(0, "STALE_REQUEST", "Yêu cầu cũ không còn được sử dụng.");
      if (value.ticket_id !== id || value.customer.customer_id !== value.customer_id || value.device.device_id !== value.device_id) throw new ContractError();
      setState({ data: value, loading: false });
      return value;
    } catch (error) {
      if (generation.current === version) setState(value => ({ ...value, loading: false, error }));
      throw error;
    }
  }, [api, id]);
  useEffect(() => {
    let active = true;
    // Lỗi initial read đã được xuất qua state, không để Promise rejection thoát ra UI.
    void Promise.resolve().then(() => { if (active) void refresh().catch(() => {}); });
    return () => { active = false; invalidate(); };
  }, [refresh, invalidate]);
  const applyApproval = useCallback((approval: Approval) => {
    generation.current++;
    setState(value => value.data ? { data: { ...value.data, ...approval }, loading: false } : value);
  }, []);
  return { ...state, refresh, applyApproval };
}
