# Task Manager — Next.js 15 + tRPC

A small task manager built for a technical challenge: a Next.js 15 (App Router) app
whose backend is a tRPC router that keeps tasks **in memory** (no database).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # router unit tests (Vitest)
npm run build && npm start   # production build
```

Requires Node.js 18.18+ (tested on Node 24). No environment variables or secrets are needed.

## What it does

- **Tasks** have `id` (UUID), `titulo` (required), `descricao` (optional) and `dataCriacao` (timestamp).
- **CRUD over tRPC**: `task.list`, `task.byId`, `task.create`, `task.update`, `task.delete`.
- **Validation**: Zod schemas on every procedure. Empty or whitespace-only titles are rejected
  (`BAD_REQUEST`); updating or deleting a missing task returns `NOT_FOUND` with a clear message.
- **List page (`/`)** is server-side rendered: the Server Component calls the router directly and
  passes the first page to the client as initial data, so tasks are in the first HTML response.
- **Delete** from the list with success/error feedback and a per-item loading state.
- **Create/edit form** (`/tasks/new`, `/tasks/[id]/edit`): functional components + hooks,
  client-side validation (title required) mirrored by the backend, server errors shown in the form.
- **Bonus: infinite scroll** with cursor-based pagination and an `IntersectionObserver` sentinel.
  25 fictional seed tasks are loaded at startup so the scroll can be seen.

## Structure

```
src/
  server/
    store.ts            in-memory Map (one per server process, kept on globalThis)
    trpc.ts             tRPC init: superjson transformer + readable Zod errors
    routers/task.ts     task procedures (validation, errors, pagination)
    routers/_app.ts     root router + exported AppRouter type
    routers/task.test.ts
  trpc/
    client.tsx          React Query + tRPC provider for Client Components
    server.ts           server-side caller used for SSR
  app/
    api/trpc/[trpc]/route.ts   tRPC HTTP endpoint (Route Handler)
    page.tsx                   SSR task list
    tasks/new, tasks/[id]/edit form pages
  components/TaskList.tsx, TaskForm.tsx
```

## Main decisions

- **Only the router type crosses to the client** (`AppRouter`), giving end-to-end type safety
  without code generation.
- **superjson** so `dataCriacao` arrives on the client as a `Date`, not a string.
- **Cursor pagination instead of offset**: stays correct when tasks are created or deleted between
  page loads, which is what infinite scroll needs.
- **Validation on both sides**: the form validates for fast feedback; the server validates because
  the client can't be trusted.
- **SSR via a direct server caller** (no HTTP hop on the server) and `dynamic = "force-dynamic"`,
  because the list changes at runtime and must never be prerendered at build time.
- **In-memory store limits**: data resets on restart and isn't shared across multiple server
  instances. A real deployment would swap `store.ts` for a database behind the same router.

All data in this repository is fictional.
