import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mekong Mobile — Tiếp nhận bảo hành",
  description: "Prototype L2: tiếp nhận, phân loại và phê duyệt ngoại lệ bảo hành.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
    >
      <body>{children}</body>
    </html>
  );
}
