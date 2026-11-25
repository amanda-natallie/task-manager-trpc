import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { compareTasks, sortedTasks, store, type Task } from "../store";

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
   * Cursor-based pagination for the infinite scroll. The cursor is the sort key
   * (dataCriacao + id) of the last task the client already has, not its index or
   * just its id. The next page is "every task that sorts after this key", so it
   * stays correct even if that task (or any other) was deleted or a new one was
   * created between page loads: no skipped or repeated items.
   */
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(10),
          cursor: z.object({ dataCriacao: z.date(), id: z.string() }).nullish(),
        })
        .default({}),
    )
    .query(({ input }) => {
      const all = sortedTasks();
      const { cursor } = input;
      const rest = cursor ? all.filter((t) => compareTasks(t, cursor) > 0) : all;
      const items = rest.slice(0, input.limit);
      const last = items[items.length - 1];
      const nextCursor =
        rest.length > input.limit && last ? { dataCriacao: last.dataCriacao, id: last.id } : null;
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
