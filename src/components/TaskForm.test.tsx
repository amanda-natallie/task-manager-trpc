// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, type Operation, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@/server/routers/_app";
import { TRPCProvider } from "@/trpc/client";
import { TaskForm } from "./TaskForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

/**
 * Renders the form with a fake tRPC link instead of HTTP: it records every
 * operation the form sends and answers with a created task.
 */
function renderForm() {
  const ops: Operation[] = [];
  const fakeLink: TRPCLink<AppRouter> = () => ({ op }) =>
    observable((observer) => {
      ops.push(op);
      observer.next({ result: { type: "data", data: { id: "1", titulo: "x", dataCriacao: new Date() } } });
      observer.complete();
    });
  const queryClient = new QueryClient();
  const trpcClient = createTRPCClient<AppRouter>({ links: [fakeLink] });
  render(
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <TaskForm />
      </TRPCProvider>
    </QueryClientProvider>,
  );
  return { ops };
}

describe("TaskForm", () => {
  afterEach(() => {
    cleanup();
    push.mockReset();
  });

  it("blocks submit and shows an error when the title is empty", () => {
    const { ops } = renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(screen.getByText("Title is required")).toBeTruthy();
    expect(ops).toHaveLength(0); // nothing was sent to the backend
  });

  it("sends task.create with the form values and goes back to the list", async () => {
    const { ops } = renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Buy milk" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/?msg=created"));
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ type: "mutation", path: "task.create", input: { titulo: "Buy milk" } });
  });
});
