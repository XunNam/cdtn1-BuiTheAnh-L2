"use client";

import { useEffect, useState } from "react";

export function useRemote<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{
    loading: boolean;
    load?: () => Promise<T>;
    version?: number;
    data?: T;
    error?: unknown;
  }>({ loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setState({ loading: true, load, version });
      try {
        const data = await load();
        if (active) setState({ loading: false, data, load, version });
      } catch (error) {
        if (active) setState({ loading: false, error, load, version });
      }
    });
    return () => { active = false; };
  }, [load, version]);

  // Không dùng kết quả của ID/bộ lọc cũ trong lúc effect mới chưa chạy.
  return {
    ...(state.load === load && state.version === version
      ? state
      : { loading: true, data: undefined, error: undefined }),
    retry: () => setVersion(value => value + 1),
  };
}
