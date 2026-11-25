import { expect, test, type Page } from "@playwright/test";

/** A title no other test (or earlier run against the same server) will use. */
const uniqueTitle = (label: string) => `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function createTask(page: Page, titulo: string, descricao?: string) {
  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(titulo);
  if (descricao) await page.getByLabel("Description").fill(descricao);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL("/");
}

test("creates a task and shows it at the top of the list", async ({ page }) => {
  const titulo = uniqueTitle("Buy milk");
  await createTask(page, titulo, "Two litres");

  await expect(page.getByRole("status")).toContainText("Task created.");
  const first = page.getByRole("article").first();
  await expect(first.getByRole("heading", { name: titulo })).toBeVisible();
  await expect(first).toContainText("Two litres");
});

test("edits a task", async ({ page }) => {
  const titulo = uniqueTitle("Draft report");
  const novoTitulo = uniqueTitle("Final report");
  await createTask(page, titulo);

  await page.getByRole("link", { name: `Edit ${titulo}` }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue(titulo);
  await page.getByLabel("Title").fill(novoTitulo);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status")).toContainText("Task updated.");
  await expect(page.getByRole("heading", { name: novoTitulo })).toBeVisible();
  await expect(page.getByRole("heading", { name: titulo })).toHaveCount(0);
});

test("deletes a task after confirming", async ({ page }) => {
  const titulo = uniqueTitle("Old task");
  await createTask(page, titulo);

  // Cancelling the confirmation keeps the task.
  const dialog = page.getByRole("dialog", { name: "Delete task?" });
  await page.getByRole("button", { name: `Delete ${titulo}` }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(titulo);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

  // Esc also closes it without deleting.
  await page.getByRole("button", { name: `Delete ${titulo}` }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

  // Confirming deletes the task.
  await page.getByRole("button", { name: `Delete ${titulo}` }).click();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Task deleted.");
  await expect(page.getByRole("heading", { name: titulo })).toHaveCount(0);

  // It is gone on the server too, not just hidden in the browser.
  await page.reload();
  await expect(page.getByRole("heading", { name: titulo })).toHaveCount(0);
});

test("shows a validation error for an empty title and sends nothing", async ({ page }) => {
  await page.goto("/tasks/new");
  let sent = false;
  page.on("request", (req) => {
    if (req.url().includes("/api/trpc/task.create")) sent = true;
  });

  await page.getByLabel("Title").fill("   ");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Title is required" })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL("/tasks/new");
  expect(sent).toBe(false);
});

test("opens a seeded task by its fixed id", async ({ page }) => {
  // Seed ids are deterministic, so every server instance knows this task.
  const response = await page.goto("/tasks/00000000-0000-4000-8000-000000000001/edit");
  expect(response?.status()).toBe(200);
  await expect(page.getByLabel("Title")).toHaveValue("Example task 1");
});

test("answers 404 for a task that does not exist", async ({ page }) => {
  const response = await page.goto("/tasks/does-not-exist/edit");
  expect(response?.status()).toBe(404);
});
