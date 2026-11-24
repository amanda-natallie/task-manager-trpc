import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

/**
 * tRPC bootstrap. superjson lets `Date` (dataCriacao) travel over the wire as a
 * real Date instead of a string. The error formatter exposes Zod field errors so
 * the form can show them next to the right input.
 */
const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const zod = error.cause instanceof ZodError ? error.cause : null;
    return {
      ...shape,
      // Replace Zod's raw JSON dump with the first human-readable message.
      message: zod ? zod.issues[0]?.message ?? "Invalid input" : shape.message,
      data: {
        ...shape.data,
        zodError: zod ? zod.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
