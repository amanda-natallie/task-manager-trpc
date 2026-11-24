import "server-only";
import { createCallerFactory } from "@/server/trpc";
import { appRouter } from "@/server/routers/_app";

/**
 * Server-side caller used by Server Components for SSR. It calls the router
 * directly (no HTTP round trip), so the first page of tasks is already in the
 * HTML the browser receives.
 */
export const serverCaller = createCallerFactory(appRouter)({});
