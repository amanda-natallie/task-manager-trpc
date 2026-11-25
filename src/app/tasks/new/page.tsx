import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "@/components/TaskForm";

export default function NewTaskPage() {
  return (
    <>
      <Link href="/" className="back-link">
        <ArrowLeft aria-hidden="true" size={16} />
        Back to tasks
      </Link>
      <div className="page-header">
        <h1>New task</h1>
        <p className="subtitle">Give it a title. The description is optional.</p>
      </div>
      <div className="panel">
        <TaskForm />
      </div>
    </>
  );
}
