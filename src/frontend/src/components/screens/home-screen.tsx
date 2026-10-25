"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "../auth/session-provider";
import { homePath } from "../../lib/navigation";

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  useEffect(() => { router.replace(session ? homePath(session.principal.role) : "/login"); }, [session, router]);
  return <p role="status" className="notice">Đang mở màn hình chính…</p>;
}
