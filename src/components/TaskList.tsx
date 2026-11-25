"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";
import { useTRPC } from "@/trpc/client";

type ListPage = inferRouterOutputs<AppRouter>["task"]["list"];
type Feedback = { kind: "success" | "error"; text: string } | null;

const FLASH: Record<string, string> = {
  created: "Task created.",
  updated: "Task updated.",
};

// A fixed time zone makes the server HTML and the client render produce the same
// text. With the default (each machine's own zone) a visitor in another zone would
// get a hydration mismatch.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function TaskList({
  initialPage,
  pageSize,
  flash,
}: {
  initialPage: ListPage;
  pageSize: number;
  flash?: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Feedback>(
    flash && FLASH[flash] ? { kind: "success", text: FLASH[flash] } : null,
  );

  // The flash message came in the URL (?msg=created). Remove it once shown, so a
  // reload or a shared link doesn't show "Task created." again. replaceState only
  // changes the address bar: no navigation and no new server render.
  useEffect(() => {
    if (flash) window.history.replaceState(null, "", window.location.pathname);
  }, [flash]);

  const listOptions = trpc.task.list.infiniteQueryOptions(
    { limit: pageSize },
    {
      getNextPageParam: (last) => last.nextCursor,
      // Seed the cache with the SSR page so the first render matches the server HTML.
      initialData: { pages: [initialPage], pageParams: [null] },
    },
  );
  const query = useInfiniteQuery(listOptions);

  const deleteTask = useMutation(
    trpc.task.delete.mutationOptions({
      onSuccess: () => {
        setFeedback({ kind: "success", text: "Task deleted." });
        return queryClient.invalidateQueries({ queryKey: trpc.task.list.pathKey() });
      },
      onError: (err) => setFeedback({ kind: "error", text: `Could not delete: ${err.message}` }),
    }),
  );

  // Infinite scroll: when the sentinel at the bottom becomes visible, load the next page.
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const tasks = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section>
      {feedback && (
        <div role="status" className={`alert ${feedback.kind}`}>
          {feedback.text}
        </div>
      )}
      {query.isError && <div className="alert error">Could not load tasks: {query.error.message}</div>}

      {tasks.length === 0 && <p className="muted">No tasks yet. Create the first one.</p>}

      {tasks.map((task) => {
        const deleting = deleteTask.isPending && deleteTask.variables?.id === task.id;
        return (
          <article key={task.id} className="card">
            <div className="card-body">
              <h3>{task.titulo}</h3>
              {task.descricao && <p>{task.descricao}</p>}
              <span className="meta">Created {dateFormat.format(task.dataCriacao)} UTC</span>
            </div>
            <div className="actions">
              <Link className="button" href={`/tasks/${task.id}/edit`}>
                Edit
              </Link>
              <button
                className="danger"
                disabled={deleting}
                onClick={() => {
                  if (!window.confirm(`Delete "${task.titulo}"?`)) return;
                  setFeedback(null);
                  deleteTask.mutate({ id: task.id });
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </article>
        );
      })}

      <div ref={sentinel} />
      {isFetchingNextPage && <p className="muted">Loading more…</p>}
      {!hasNextPage && tasks.length > 0 && <p className="muted">All {tasks.length} tasks loaded.</p>}
    </section>
  );
}
