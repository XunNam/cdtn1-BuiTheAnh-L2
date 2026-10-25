"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createApiClient } from "../../lib/api-client";
import type { ApiClient } from "../../lib/api-client";
import type { Login } from "../../lib/contracts";

type SessionContextValue = {
  api: ApiClient;
  session: Login | null;
  expired: boolean;
  requestedPath: string | null;
  rememberPath: (path: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Login | null>(null);
  const [expired, setExpired] = useState(false);
  const [requestedPath, setRequestedPath] = useState<string | null>(null);
  const [api] = useState(() => createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_L2_API_BASE ?? "/api",
    onUnauthorized: () => {
      setSession(null);
      setExpired(true);
    },
  }));

  useEffect(() => () => api.setToken(null), [api]);
  const rememberPath = useCallback((path: string) => setRequestedPath(path), []);

  async function login(username: string, password: string) {
    const result = await api.login(username, password);
    setSession(result);
    setExpired(false);
  }

  function logout() {
    api.setToken(null);
    setSession(null);
    setExpired(false);
    setRequestedPath(null);
  }

  return (
    <SessionContext.Provider value={{ api, session, expired, requestedPath, rememberPath, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("SessionProvider chưa được gắn vào layout.");
  return context;
}
