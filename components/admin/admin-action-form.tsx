"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { PendingStatus } from "@/components/shared/motion-primitives";
import { showAppFeedbackFromResult } from "@/components/shared/app-feedback";
import type { ActionResult } from "@/lib/admin/action-result";
import { cn } from "@/lib/utils";

const initial: ActionResult = { ok: true };

type AdminActionFormProps = {
  action: (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  id?: string;
  onSuccess?: (result: ActionResult) => void;
  /** Hide success dialog (errors still show inline). Use when a parent owns the success UI. */
  quietSuccess?: boolean;
  /** Pending status label under the form. */
  pendingLabel?: string;
};

export function AdminActionForm({
  action,
  children,
  className,
  id,
  onSuccess,
  quietSuccess = false,
  pendingLabel = "Working…",
}: AdminActionFormProps) {
  const [state, formAction, pending] = useActionState(action, initial);
  const wasPending = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Only fire after a real submit finishes — not on initial mount.
    if (wasPending.current && !pending) {
      if (state.ok) {
        setFormError(null);
        // Close parent dialogs / refresh first so success UI is never trapped
        // under a Radix modal (pointer-events lock).
        onSuccess?.(state);
        if (!quietSuccess && state.message) {
          // Wait a tick so the parent Dialog can unmount RemoveScroll.
          window.setTimeout(() => {
            showAppFeedbackFromResult(true, state.message);
          }, 0);
        }
      } else if (state.message) {
        setFormError(state.message);
      }
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess, quietSuccess]);

  return (
    <form
      id={id}
      action={formAction}
      className={cn("relative space-y-3", className)}
      aria-busy={pending || undefined}
    >
      <fieldset
        disabled={pending}
        className={cn(
          "min-w-0 space-y-3 border-0 p-0 transition-opacity duration-200",
          pending && "opacity-70",
        )}
      >
        {children}
      </fieldset>
      <PendingStatus show={pending} label={pendingLabel} />
      {formError && !pending ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
