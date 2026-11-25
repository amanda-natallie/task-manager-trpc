import { TaskList } from "@/components/TaskList";
import { serverCaller } from "@/trpc/server";

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
  const [firstPage, { msg }] = await Promise.all([
    serverCaller.task.list({ limit: PAGE_SIZE }),
    searchParams,
  ]);
  return (
    <>
      <h1>Tasks</h1>
      <TaskList initialPage={firstPage} pageSize={PAGE_SIZE} flash={msg} />
    </>
  );
}
