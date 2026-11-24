import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { sortedTasks, store, type Task } from "../store";

// Shared validation. `trim()` before `min(1)` so "   " is rejected as an empty title.
const titulo = z.string().trim().min(1, "Title is required").max(120, "Title is too long");
const descricao = z.string().trim().max(1000, "Description is too long").optional();

function getOrThrow(id: string): Task {
  const task = store.tasks.get(id);
  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Task ${id} not found` });
  }
  return task;
}

export const taskRouter = router({
  /**
   * Cursor-based pagination: the cursor is the id of the last task the client
   * already has. Cursor pagination (instead of offset) stays correct when tasks
   * are created or deleted between page loads, which matters for infinite scroll.
   */
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(10),
          cursor: z.string().nullish(),
        })
        .default({}),
    )
    .query(({ input }) => {
      const all = sortedTasks();
      let start = 0;
      if (input.cursor) {
        const idx = all.findIndex((t) => t.id === input.cursor);
        // If the cursor task was deleted meanwhile, fall back to the start of the list.
        start = idx === -1 ? 0 : idx + 1;
      }
      const items = all.slice(start, start + input.limit);
      const nextCursor = start + input.limit < all.length ? items[items.length - 1]?.id ?? null : null;
      return { items, nextCursor, total: all.length };
    }),

  byId: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => getOrThrow(input.id)),

  create: publicProcedure.input(z.object({ titulo, descricao })).mutation(({ input }) => {
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: input.titulo,
      descricao: input.descricao || undefined,
      dataCriacao: new Date(),
    };
    store.tasks.set(task.id, task);
    return task;
  }),

  update: publicProcedure
    .input(z.object({ id: z.string(), titulo, descricao }))
    .mutation(({ input }) => {
      const current = getOrThrow(input.id);
      const updated: Task = { ...current, titulo: input.titulo, descricao: input.descricao || undefined };
      store.tasks.set(updated.id, updated);
      return updated;
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => {
    getOrThrow(input.id);
    store.tasks.delete(input.id);
    return { id: input.id };
  }),
});
