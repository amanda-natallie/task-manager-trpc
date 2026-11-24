"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type Initial = { id: string; titulo: string; descricao?: string };

/** One form for both create and edit: if `initial` is passed we are editing. */
export function TaskForm({ initial }: { initial?: Initial }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const onSuccess = async (msg: "created" | "updated") => {
    await queryClient.invalidateQueries({ queryKey: trpc.task.list.pathKey() });
    router.push(`/?msg=${msg}`);
    router.refresh(); // re-run the SSR page so it shows the fresh list
  };
  const onError = (err: { message: string; data?: { zodError?: { fieldErrors: Record<string, string[] | undefined> } | null } | null }) => {
    // Prefer the field-level message from Zod when the backend rejected the input.
    const fieldMsg = err.data?.zodError?.fieldErrors.titulo?.[0];
    if (fieldMsg) setTitleError(fieldMsg);
    else setServerError(err.message);
  };

  const create = useMutation(trpc.task.create.mutationOptions({ onSuccess: () => onSuccess("created"), onError }));
  const update = useMutation(trpc.task.update.mutationOptions({ onSuccess: () => onSuccess("updated"), onError }));
  const pending = create.isPending || update.isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    // Client-side validation mirrors the backend rule, so the user gets instant feedback.
    // The backend still validates: the client can never be trusted alone.
    if (!titulo.trim()) {
      setTitleError("Title is required");
      return;
    }
    setTitleError(null);
    const payload = { titulo, descricao: descricao.trim() || undefined };
    if (initial) update.mutate({ id: initial.id, ...payload });
    else create.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && <div className="alert error">{serverError}</div>}
      <label>
        Title *
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-invalid={!!titleError}
          maxLength={120}
          autoFocus
        />
        {titleError && <span className="field-error">{titleError}</span>}
      </label>
      <label>
        Description
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} maxLength={1000} />
      </label>
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "Saving…" : initial ? "Save changes" : "Create task"}
      </button>{" "}
      <button type="button" onClick={() => router.push("/")} disabled={pending}>
        Cancel
      </button>
    </form>
  );
}
