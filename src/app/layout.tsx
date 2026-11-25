import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { SquareCheckBig, Plus } from "lucide-react";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Manager · Next.js + tRPC",
  description:
    "A small task manager: create, edit, delete and browse tasks. Built with Next.js 15 (App Router), tRPC, React Query and Zod.",
};

// Responsive layout at device width; dark UI, so the browser chrome and form controls are dark too.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>
        {/* First focusable element: lets keyboard users jump past the header. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="header">
          <nav aria-label="Main" className="nav">
            <Link href="/" className="brand">
              <SquareCheckBig aria-hidden="true" size={20} className="brand-icon" />
              Tasks
            </Link>
            <Link href="/tasks/new" className="button primary">
              <Plus aria-hidden="true" size={16} />
              New task
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
