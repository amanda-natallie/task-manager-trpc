import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { TaskForm } from "@/components/TaskForm";
import { serverCaller } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Load the task on the server so the form opens already filled in.
    const task = await serverCaller.task.byId({ id });
    return (
      <>
        <h1>Edit task</h1>
        <TaskForm initial={{ id: task.id, titulo: task.titulo, descricao: task.descricao }} />
      </>
    );
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
