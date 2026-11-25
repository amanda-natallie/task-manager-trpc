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

  // Optimistic delete: the task leaves the list at once; if the server call fails
  // the previous list is put back and an error is shown. Either way the list is
  // refetched at the end so it matches the server.
  const deleteTask = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async ({ id }) => {
        setFeedback(null);
        await queryClient.cancelQueries({ queryKey: listOptions.queryKey });
        const previous = queryClient.getQueryData(listOptions.queryKey);
        queryClient.setQueryData(listOptions.queryKey, (old) =>
          old
            ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.filter((t) => t.id !== id) })) }
            : old,
        );
        return { previous };
      },
      onError: (err, _input, context) => {
        if (context?.previous) queryClient.setQueryData(listOptions.queryKey, context.previous);
        setFeedback({ kind: "error", text: `Could not delete: ${err.message}` });
      },
      onSuccess: () => setFeedback({ kind: "success", text: "Task deleted." }),
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.task.list.pathKey() }),
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
    <section aria-label="Task list">
      {/* Live regions stay in the DOM so screen readers announce new messages. */}
      <div role="status">
        {feedback?.kind === "success" && <div className="alert success">{feedback.text}</div>}
      </div>
      <div role="alert">
        {feedback?.kind === "error" && <div className="alert error">{feedback.text}</div>}
        {query.isError && <div className="alert error">Could not load tasks: {query.error.message}</div>}
      </div>

      {tasks.length === 0 && <p className="muted">No tasks yet. Create the first one.</p>}

      {tasks.map((task) => (
        <article key={task.id} className="card">
          <div className="card-body">
            <h2>{task.titulo}</h2>
            {task.descricao && <p>{task.descricao}</p>}
            <span className="meta">
              Created <time dateTime={task.dataCriacao.toISOString()}>{dateFormat.format(task.dataCriacao)} UTC</time>
            </span>
          </div>
          <div className="actions">
            {/* aria-label adds the task title, so each button has a unique name for screen readers. */}
            <Link className="button" href={`/tasks/${task.id}/edit`} aria-label={`Edit ${task.titulo}`}>
              Edit
            </Link>
            <button
              type="button"
              className="danger"
              aria-label={`Delete ${task.titulo}`}
              onClick={() => {
                if (!window.confirm(`Delete "${task.titulo}"?`)) return;
                deleteTask.mutate({ id: task.id });
              }}
            >
              Delete
            </button>
          </div>
        </article>
      ))}

      <div ref={sentinel} aria-hidden="true" />
      {isFetchingNextPage && (
        <p className="muted" role="status">
          Loading more…
        </p>
      )}
      {!hasNextPage && tasks.length > 0 && <p className="muted">All {tasks.length} tasks loaded.</p>}
    </section>
  );
}
