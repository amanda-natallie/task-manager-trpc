import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Manager · Next.js + tRPC",
  description:
    "A small task manager: create, edit, delete and browse tasks. Built with Next.js 15 (App Router), tRPC, React Query and Zod.",
};

// Responsive layout: render at the device width instead of a zoomed-out desktop page.
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d4ed8" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* First focusable element: lets keyboard users jump past the header. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="header">
          <nav aria-label="Main" className="nav">
            <Link href="/" className="brand">
              Tasks
            </Link>
            <Link href="/tasks/new" className="button">
              + New task
            </Link>
          </nav>
        </header>
        <main id="main" className="container" tabIndex={-1}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </main>
      </body>
    </html>
  );
}
