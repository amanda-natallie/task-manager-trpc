import { TaskList } from "@/components/TaskList";
import { getServerTrpc } from "@/trpc/server";

// The list lives in server memory and changes on every mutation, so this page
// must be rendered per request (SSR), never statically at build time.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  // SSR: fetch the first page on the server and hand it to the client component
  // as initial data, so the user sees tasks immediately with no loading spinner.
  const trpc = await getServerTrpc();
  const [firstPage, { msg }] = await Promise.all([
    trpc.task.list.query({ limit: PAGE_SIZE }),
    searchParams,
  ]);
  return (
    <>
      <div className="page-header">
        <h1>Tasks</h1>
        <p className="subtitle">Everything on your list, kept in server memory.</p>
      </div>
      <TaskList initialPage={firstPage} pageSize={PAGE_SIZE} flash={msg} />
    </>
  );
}
