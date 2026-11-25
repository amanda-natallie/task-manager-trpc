import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

export const metadata: Metadata = { title: "Task Manager · Next.js + tRPC" };

// Responsive layout: render at the device width instead of a zoomed-out desktop page.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <Link href="/" className="brand">
            Tasks
          </Link>
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
