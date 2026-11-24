import { router } from "../trpc";
import { taskRouter } from "./task";

export const appRouter = router({ task: taskRouter });

// Only the *type* is shared with the client: this is what gives end-to-end type safety.
export type AppRouter = typeof appRouter;
