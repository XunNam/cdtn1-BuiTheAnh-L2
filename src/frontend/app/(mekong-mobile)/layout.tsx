export default function MekongMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider><AppShell>{children}</AppShell></SessionProvider>;
}
import { SessionProvider } from "../../src/components/auth/session-provider";
import { AppShell } from "../../src/components/layout/app-shell";

