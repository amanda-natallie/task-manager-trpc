// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@/server/routers/_app";
import type { Task } from "@/server/store";
import { TRPCProvider } from "@/trpc/client";
import { TaskList } from "./TaskList";

const tasks: Task[] = [
  { id: "a", titulo: "Task A", dataCriacao: new Date("2026-01-02T10:00:00Z") },
  { id: "b", titulo: "Task B", dataCriacao: new Date("2026-01-01T10:00:00Z") },
];

/**
 * Renders the list with a fake tRPC link instead of HTTP. `task.delete` answers
 * after a short delay, either with success (the "server" drops the task) or with
 * an error; `task.list` returns whatever the fake server currently holds.
 */
function renderList({ deleteFails }: { deleteFails: boolean }) {
  let server = [...tasks];
  const fakeLink: TRPCLink<AppRouter> = () => ({ op }) =>
    observable((observer) => {
      if (op.path === "task.delete") {
        const timer = setTimeout(() => {
          if (deleteFails) return observer.error(TRPCClientError.from(new Error("Server unavailable")));
          const { id } = op.input as { id: string };
          server = server.filter((t) => t.id !== id);
          observer.next({ result: { type: "data", data: { id } } });
          observer.complete();
        }, 20);
        return () => clearTimeout(timer);
      }
      observer.next({ result: { type: "data", data: { items: server, nextCursor: null, total: server.length } } });
      observer.complete();
    });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const trpcClient = createTRPCClient<AppRouter>({ links: [fakeLink] });
  render(
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <TaskList initialPage={{ items: tasks, nextCursor: null, total: tasks.length }} pageSize={10} />
      </TRPCProvider>
    </QueryClientProvider>,
  );
}

describe("TaskList optimistic delete", () => {
  beforeEach(() => {
    // jsdom has no IntersectionObserver (used by the infinite scroll).
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("removes the task right away and confirms when the server succeeds", async () => {
    renderList({ deleteFails: false });
    fireEvent.click(screen.getByRole("button", { name: "Delete Task A" }));
    await waitFor(() => expect(screen.queryByText("Task A")).toBeNull()); // before the server answers
    expect(await screen.findByText("Task deleted.")).toBeTruthy();
    expect(screen.queryByText("Task A")).toBeNull();
    expect(screen.getByText("Task B")).toBeTruthy();
  });

  it("puts the task back and shows an error when the server fails", async () => {
    renderList({ deleteFails: true });
    fireEvent.click(screen.getByRole("button", { name: "Delete Task A" }));
    await waitFor(() => expect(screen.queryByText("Task A")).toBeNull());
    expect(await screen.findByText("Could not delete: Server unavailable")).toBeTruthy();
    expect(screen.getByText("Task A")).toBeTruthy(); // rolled back
  });
});
