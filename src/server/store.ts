/**
 * In-memory task store.
 *
 * The challenge asks for no database, so tasks live in a Map. The Map is kept
 * on `globalThis` so there is exactly one list per server process: Next.js can
 * load this module in more than one bundle (Route Handler vs. Server Components)
 * and re-evaluates it on hot reload in development. Data is lost when the
 * server restarts, which is expected for this exercise.
 */
export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: Date;
};

type Store = { tasks: Map<string, Task> };

const globalForStore = globalThis as unknown as { __taskStore?: Store };

function seed(): Map<string, Task> {
  // A few fictional tasks so the list and the infinite scroll have something to show.
  const map = new Map<string, Task>();
  const now = Date.now();
  for (let i = 1; i <= 25; i++) {
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: `Example task ${i}`,
      descricao: i % 3 === 0 ? undefined : `Fictional description for task ${i}`,
      // Older tasks get older timestamps so the newest-first order is stable.
      dataCriacao: new Date(now - (25 - i) * 60_000),
    };
    map.set(task.id, task);
  }
  return map;
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
