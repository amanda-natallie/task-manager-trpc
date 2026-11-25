import { beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./_app";
import { createCallerFactory } from "../trpc";
import { resetStore, seedTasks } from "../store";
import { POST } from "@/app/api/trpc/[trpc]/route";

const caller = createCallerFactory(appRouter)({});

describe("task router", () => {
  beforeEach(() => resetStore());

  it("creates and lists tasks", async () => {
    const created = await caller.task.create({ titulo: "Write README" });
    expect(created.id).toBeTruthy();
    expect(created.dataCriacao).toBeInstanceOf(Date);
    const page = await caller.task.list({ limit: 10 });
    expect(page.items.map((t) => t.titulo)).toEqual(["Write README"]);
  });

  it("rejects an empty or whitespace-only title", async () => {
    await expect(caller.task.create({ titulo: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns NOT_FOUND when updating or deleting a missing task", async () => {
    await expect(caller.task.update({ id: "missing", titulo: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.task.delete({ id: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates and deletes", async () => {
    const t = await caller.task.create({ titulo: "Old", descricao: "d" });
    const u = await caller.task.update({ id: t.id, titulo: "New" });
    expect(u.titulo).toBe("New");
    expect(u.dataCriacao).toEqual(t.dataCriacao);
    await caller.task.delete({ id: t.id });
    expect((await caller.task.list({ limit: 10 })).items).toHaveLength(0);
  });

  it("paginates with a cursor", async () => {
    for (let i = 0; i < 5; i++) await caller.task.create({ titulo: `T${i}` });
    const p1 = await caller.task.list({ limit: 2 });
    const p2 = await caller.task.list({ limit: 2, cursor: p1.nextCursor });
    const p3 = await caller.task.list({ limit: 2, cursor: p2.nextCursor });
    expect([...p1.items, ...p2.items, ...p3.items]).toHaveLength(5);
    expect(p3.nextCursor).toBeNull();
  });

  it("keeps paginating correctly when the cursor task is deleted", async () => {
    for (let i = 0; i < 5; i++) await caller.task.create({ titulo: `T${i}` });
    const p1 = await caller.task.list({ limit: 2 });
    // Delete the very task the cursor points to before asking for the next page.
    await caller.task.delete({ id: p1.items[1]!.id });
    const p2 = await caller.task.list({ limit: 2, cursor: p1.nextCursor });
    const p3 = await caller.task.list({ limit: 2, cursor: p2.nextCursor });
    const seen = [p1.items[0]!, ...p2.items, ...p3.items].map((t) => t.id);
    expect(new Set(seen).size).toBe(seen.length); // no repeated tasks
    expect(seen).toHaveLength(4); // and none skipped
    expect(p3.nextCursor).toBeNull();
  });

  it("returns NOT_FOUND for byId with an unknown id", async () => {
    await expect(caller.task.byId({ id: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Task missing not found",
    });
  });

  // These go through the real HTTP handler so they also cover the error formatter
  // (readable message + Zod field errors) that the form relies on.
  async function post(path: string, input: unknown) {
    const res = await POST(
      new Request(`http://localhost/api/trpc/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: input }),
      }),
    );
    return { status: res.status, body: await res.json() };
  }

  it("create: returns a 400 with a field error for an empty title", async () => {
    const { status, body } = await post("task.create", { titulo: "" });
    expect(status).toBe(400);
    expect(body.error.json.message).toBe("Title is required");
    expect(body.error.json.data.zodError.fieldErrors.titulo).toEqual(["Title is required"]);
  });

  it("update: returns a 400 with a field error for a too long title", async () => {
    const t = await caller.task.create({ titulo: "Valid" });
    const { status, body } = await post("task.update", { id: t.id, titulo: "x".repeat(121) });
    expect(status).toBe(400);
    expect(body.error.json.data.zodError.fieldErrors.titulo).toEqual(["Title is too long"]);
  });

  it("seeds the same tasks (ids and dates) in every server instance", async () => {
    // Two calls stand in for two cold-started serverless instances.
    expect(seedTasks()).toEqual(seedTasks());
    resetStore(seedTasks());
    const first = await caller.task.byId({ id: "00000000-0000-4000-8000-000000000025" });
    expect(first.titulo).toBe("Example task 25");
    const page = await caller.task.list({ limit: 1 });
    expect(page.items[0]?.id).toBe(first.id); // newest seed task comes first
  });
});
