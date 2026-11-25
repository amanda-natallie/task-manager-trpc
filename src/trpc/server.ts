import "server-only";
import { headers } from "next/headers";
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers/_app";

/**
 * tRPC client for Server Components (SSR).
 *
 * It calls the app's own `/api/trpc` endpoint over HTTP instead of calling the
 * router in-process. The task store lives in server memory, and on serverless
 * hosting (Vercel) the pages and the `/api/trpc` Route Handler can run in
 * different functions, each with its own memory. Calling the router directly
 * from a page would read a different copy of the list than the browser writes
 * to. Going through `/api/trpc` means SSR and the browser read and write the
 * same store. The cost is one HTTP hop on the server; with a real database both
 * would share data and the direct caller would be the better choice again.
 */
export async function getServerTrpc() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: `${proto}://${host}/api/trpc`, transformer: superjson })],
  });
}

/** True when a server-side tRPC call failed because the record doesn't exist. */
export function isNotFound(err: unknown): boolean {
  return err instanceof TRPCClientError && err.data?.code === "NOT_FOUND";
}
