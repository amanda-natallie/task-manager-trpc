/**
 * In-memory task store.
 *
 * The challenge asks for no database, so tasks live in a Map. The Map is kept
 * on `globalThis` so there is exactly one list per server process: Next.js can
 * load this module in more than one bundle (Route Handler vs. Server Components)
 * and re-evaluates it on hot reload in development. Data is lost when the
 * server restarts, which is expected for this exercise.
 *
 * Serverless caveat: memory is per server instance, and instances don't share
 * it. That is why SSR reads through `/api/trpc` (see `src/trpc/server.ts`) and
 * the seed is deterministic. A real deployment would use a database or a KV store.
 */
export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: Date;
};

type Store = { tasks: Map<string, Task> };

const globalForStore = globalThis as unknown as { __taskStore?: Store };

/**
 * A few fictional tasks so the list and the infinite scroll have something to show.
 * Ids and dates are fixed (not random or "now") so every server instance starts
 * from the same list: on serverless hosting each cold start seeds its own copy,
 * and with random ids a task id seen in one instance would not exist in another.
 */
export const SEED_BASE_TIME = Date.UTC(2026, 0, 1, 12, 0, 0);

export function seedTasks(): Task[] {
  return Array.from({ length: 25 }, (_, index) => {
    const i = index + 1;
    return {
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      titulo: `Example task ${i}`,
      descricao: i % 3 === 0 ? undefined : `Fictional description for task ${i}`,
      // One minute apart, so the newest-first order is stable.
      dataCriacao: new Date(SEED_BASE_TIME + i * 60_000),
    };
  });
}

function seed(): Map<string, Task> {
  return new Map(seedTasks().map((t) => [t.id, t]));
}

export const store: Store = (globalForStore.__taskStore ??= { tasks: seed() });

/**
 * List order: newest first, ties broken by id so the order is total and stable.
 * Pagination uses the same comparison, so cursors always agree with the list.
 */
export function compareTasks(
  a: Pick<Task, "dataCriacao" | "id">,
  b: Pick<Task, "dataCriacao" | "id">,
): number {
  return b.dataCriacao.getTime() - a.dataCriacao.getTime() || a.id.localeCompare(b.id);
}

/** Tasks sorted newest first. Sorting on read keeps writes O(1) and is fine for an in-memory demo. */
export function sortedTasks(): Task[] {
  return [...store.tasks.values()].sort(compareTasks);
}

/** Test helper: start from a known state. */
export function resetStore(tasks: Task[] = []) {
  store.tasks = new Map(tasks.map((t) => [t.id, t]));
}
