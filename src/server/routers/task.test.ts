import { beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./_app";
import { createCallerFactory } from "../trpc";
import { resetStore } from "../store";

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
});
