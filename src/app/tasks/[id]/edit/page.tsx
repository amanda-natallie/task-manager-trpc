import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "@/components/TaskForm";
import { getServerTrpc, isNotFound } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Load the task on the server so the form opens already filled in.
    const trpc = await getServerTrpc();
    const task = await trpc.task.byId.query({ id });
    return (
      <>
        <Link href="/" className="back-link">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to tasks
        </Link>
        <div className="page-header">
          <h1>Edit task</h1>
          <p className="subtitle">Change the title or the description.</p>
        </div>
        <div className="panel">
          <TaskForm initial={{ id: task.id, titulo: task.titulo, descricao: task.descricao }} />
        </div>
      </>
    );
  } catch (err) {
    if (isNotFound(err)) notFound();
    throw err;
  }
}
