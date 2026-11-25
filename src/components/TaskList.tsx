"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlert, CircleCheck, Clock, Inbox, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import type { AppRouter } from "@/server/routers/_app";
import { useTRPC } from "@/trpc/client";
import { ConfirmDialog } from "./ConfirmDialog";

type ListPage = inferRouterOutputs<AppRouter>["task"]["list"];
type ListTask = ListPage["items"][number];
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
  const [toDelete, setToDelete] = useState<ListTask | null>(null);

  // The flash message came in the URL (?msg=created). Remove it once shown, so a
  // reload or a shared link doesn't show "Task created." again. replaceState only
  // changes the address bar: no navigation and no new server render.
  useEffect(() => {
    if (flash) window.history.replaceState(null, "", window.location.pathname);
  }, [flash]);

  // Success toasts hide themselves after a few seconds; errors stay until dismissed.
  useEffect(() => {
    if (feedback?.kind !== "success") return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

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
            ? {
                ...old,
                pages: old.pages.map((p) => ({
                  ...p,
                  items: p.items.filter((t) => t.id !== id),
                  total: p.total - 1,
                })),
              }
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

  const pages = query.data?.pages ?? [];
  const tasks = pages.flatMap((p) => p.items);
  const total = pages.at(-1)?.total ?? tasks.length;

  return (
    <section aria-label="Task list">
      {/* Toasts. The live regions stay in the DOM so screen readers announce new messages. */}
      <div className="toasts">
        <div role="status">
          {feedback?.kind === "success" && (
            <div className="toast success">
              <CircleCheck aria-hidden="true" size={18} />
              <span className="toast-text">{feedback.text}</span>
              <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setFeedback(null)}>
                <X aria-hidden="true" size={16} />
              </button>
            </div>
          )}
        </div>
        <div role="alert">
          {feedback?.kind === "error" && (
            <div className="toast error">
              <CircleAlert aria-hidden="true" size={18} />
              <span className="toast-text">{feedback.text}</span>
              <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setFeedback(null)}>
                <X aria-hidden="true" size={16} />
              </button>
            </div>
          )}
          {query.isError && (
            <div className="toast error">
              <CircleAlert aria-hidden="true" size={18} />
              <span className="toast-text">Could not load tasks: {query.error.message}</span>
            </div>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty">
          <Inbox aria-hidden="true" size={32} />
          <h2>No tasks yet</h2>
          <p>Create your first task to get started.</p>
          <Link href="/tasks/new" className="button primary">
            <Plus aria-hidden="true" size={16} />
            New task
          </Link>
        </div>
      ) : (
        <>
          <p className="list-meta">
            {total} {total === 1 ? "task" : "tasks"} · newest first
          </p>
          <ul className="tasks">
            {tasks.map((task) => (
              <li key={task.id}>
                <article className="card">
                  <div className="card-body">
                    <h2>{task.titulo}</h2>
                    {task.descricao && <p>{task.descricao}</p>}
                    <span className="meta">
                      <Clock aria-hidden="true" size={13} />
                      <time dateTime={task.dataCriacao.toISOString()}>
                        {dateFormat.format(task.dataCriacao)} UTC
                      </time>
                    </span>
                  </div>
                  <div className="actions">
                    {/* Icon-only buttons: aria-label names them (with the task title, so each is unique). */}
                    <Link
                      className="button icon-button"
                      href={`/tasks/${task.id}/edit`}
                      aria-label={`Edit ${task.titulo}`}
                      title="Edit"
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </Link>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Delete ${task.titulo}`}
                      title="Delete"
                      onClick={() => setToDelete(task)}
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}

      <div ref={sentinel} aria-hidden="true" />
      {isFetchingNextPage && (
        <p className="list-footer" role="status">
          <LoaderCircle aria-hidden="true" size={16} className="spin" />
          Loading more…
        </p>
      )}
      {!hasNextPage && tasks.length > 0 && <p className="list-footer">All {tasks.length} tasks loaded.</p>}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete task?"
        confirmLabel="Delete"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteTask.mutate({ id: toDelete.id });
          setToDelete(null);
        }}
      >
        <strong>{toDelete?.titulo}</strong> will be permanently deleted.
      </ConfirmDialog>
    </section>
  );
}
