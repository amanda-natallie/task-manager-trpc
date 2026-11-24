import type { ReactNode } from "react";
import Link from "next/link";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

export const metadata = { title: "Task Manager · Next.js + tRPC" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <Link href="/">Tasks</Link>
          <Link href="/tasks/new" className="button">
            + New task
          </Link>
        </header>
        <main className="container">
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </main>
      </body>
    </html>
  );
}
