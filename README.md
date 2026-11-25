# Task Manager — Next.js 15 + tRPC

A small task manager built for a technical challenge: a Next.js 15 (App Router) app
whose backend is a tRPC router that keeps tasks **in memory** (no database).

## Live demo

The app is deployed at [https://task-manager-trpc-zeta.vercel.app](https://task-manager-trpc-zeta.vercel.app). Pushes to `main` deploy to production automatically on Vercel.

The task list is stored in memory on the server. It is re-seeded with the example tasks whenever the serverless process restarts, so data created in the demo is not persisted.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # router + form tests (Vitest)
npm run build && npm start   # production build
```

Requires Node.js 24 (or 22.22+, the minimum for the test tooling; tested on Node 24).
No environment variables or secrets are needed.

## What it does

- **Tasks** have `id` (UUID), `titulo` (required), `descricao` (optional) and `dataCriacao` (timestamp).
- **CRUD over tRPC**: `task.list`, `task.byId`, `task.create`, `task.update`, `task.delete`.
- **Validation**: Zod schemas on every procedure. Empty or whitespace-only titles are rejected
  (`BAD_REQUEST`); updating or deleting a missing task returns `NOT_FOUND` with a clear message.
- **List page (`/`)** is server-side rendered: the Server Component calls the router directly and
  passes the first page to the client as initial data, so tasks are in the first HTML response.
- **Delete** from the list (after a confirmation) with success/error feedback and a per-item loading state.
- **Create/edit form** (`/tasks/new`, `/tasks/[id]/edit`): functional components + hooks,
  client-side validation (title required) mirrored by the backend, server errors shown in the form.
- **Bonus: infinite scroll** with cursor-based pagination and an `IntersectionObserver` sentinel.
  25 fictional seed tasks are loaded at startup so the scroll can be seen.
- **Loading and error pages**: a loading state for the list and an error boundary for every page.
- **Responsive** from small phones (~360px) to desktop: one column, cards and form buttons stack on
  narrow screens, 44px tap targets, no horizontal scrolling. Plain CSS, no UI framework.

## Structure

```
src/
  server/
    store.ts            in-memory Map (one per server process, kept on globalThis)
    trpc.ts             tRPC init: superjson transformer + readable Zod errors
    routers/task.ts     task procedures (validation, errors, pagination)
    routers/_app.ts     root router + exported AppRouter type
    routers/task.test.ts  router tests (CRUD, validation, errors, pagination)
  trpc/
    client.tsx          React Query + tRPC provider for Client Components
    server.ts           server-side caller used for SSR
  app/
    api/trpc/[trpc]/route.ts   tRPC HTTP endpoint (Route Handler)
    (list)/page.tsx            SSR task list
    (list)/loading.tsx         loading state for the list only
    error.tsx                  error boundary for every page
    tasks/new, tasks/[id]/edit form pages
  components/
    TaskList.tsx, TaskForm.tsx
    TaskForm.test.tsx          form test (React Testing Library + jsdom)
```

## Main decisions

- **Only the router type crosses to the client** (`AppRouter`), giving end-to-end type safety
  without code generation.
- **superjson** so `dataCriacao` arrives on the client as a `Date`, not a string.
- **Cursor pagination instead of offset**: the cursor is the sort key (`dataCriacao` + `id`) of the
  last loaded task, so the next page stays correct even if tasks, including that one, are created or
  deleted between page loads. No skipped or repeated items while scrolling.
- **Validation on both sides**: the form validates for fast feedback; the server validates because
  the client can't be trusted.
- **SSR via a direct server caller** (no HTTP hop on the server) and `dynamic = "force-dynamic"`,
  because the list changes at runtime and must never be prerendered at build time.
- **Loading state only on the list** (route group `(list)`): a loading boundary makes Next.js start
  streaming the page with HTTP 200 before it knows the result, so with one on the edit page a
  missing task could no longer answer with a real 404.
- **Dates shown in UTC**: the list is rendered on the server and again in the browser; a fixed time
  zone makes both renders identical (no hydration mismatch for visitors in other zones).
- **Next.js 15, not 16**: the challenge asks for Next.js v15, so the app uses the latest 15.x release.
- **Portuguese field names** (`titulo`, `descricao`, `dataCriacao`): they match the challenge
  statement exactly, so the model can be checked against it. Everything else is in English.
- **In-memory store limits**: data resets on restart and isn't shared across multiple server
  instances. A real deployment would swap `store.ts` for a database behind the same router.

## Manual test checklist

1. Open `/`: the first 10 tasks are already in the page source (SSR). Scroll down to load the rest.
2. Click **Delete** on a task, confirm: it disappears and "Task deleted." is shown.
3. Click **+ New task**, submit with an empty title: "Title is required" appears and nothing is sent.
4. Create a task with a title: you are back on the list, it is at the top, "Task created." is shown,
   and `?msg=created` is removed from the address bar.
5. Click **Edit**, change the title, save: "Task updated." is shown.
6. Open `/tasks/does-not-exist/edit`: a 404 page is shown (HTTP status 404).
7. Resize the window down to phone width (or use the browser's device mode): everything stays
   readable and tappable, with no horizontal scrolling.

## What I'd do next

- **Database** (for example PostgreSQL) behind the same router, replacing `store.ts`, so data
  survives restarts and is shared across server instances.
- **Authentication and authorization** in the tRPC context and a `protectedProcedure`, so each user
  only sees and changes their own tasks.
- **Rate limiting** and request size limits on the API route.
- **Optimistic updates** for delete and edit, and an undo for delete instead of a confirm dialog.
- **End-to-end tests** (for example Playwright) for the flows in the checklist above.
- **ESLint** and CI running type check, tests and build on every pull request.

All data in this repository is fictional.
