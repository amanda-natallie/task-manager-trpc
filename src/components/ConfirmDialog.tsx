"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Small confirmation dialog on top of the native <dialog> element: showModal()
 * gives a focus trap, Esc to close and an inert background without a UI library.
 * Cancel comes first in the DOM, so it gets the initial focus (the safe choice).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // onClose also fires on Esc, so the parent state always matches the dialog.
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} aria-describedby={descId} onClose={onCancel}>
      <h2 id={titleId}>{title}</h2>
      <p id={descId}>{children}</p>
      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="danger-solid" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
