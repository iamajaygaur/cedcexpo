"use client";

import { useSyncExternalStore } from "react";

import {
  FeedbackDialog,
  feedbackCopyFromResult,
  type FeedbackTone,
} from "@/components/shared/feedback-dialog";

type FeedbackPayload = {
  tone: FeedbackTone;
  title: string;
  description?: string;
  actionLabel?: string;
};

type Store = {
  open: boolean;
  payload: FeedbackPayload;
  onDismiss?: () => void;
};

const emptyPayload: FeedbackPayload = {
  tone: "success",
  title: "Success",
};

let store: Store = { open: false, payload: emptyPayload };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return store;
}

type ShowOptions = {
  /** Runs after Continue / dismiss (e.g. redirect). */
  onDismiss?: () => void;
};

/** Show a success/error dialog above the whole app (outside any parent Dialog). */
export function showAppFeedback(
  payload: FeedbackPayload,
  options?: ShowOptions,
) {
  store = {
    open: true,
    payload,
    onDismiss: options?.onDismiss,
  };
  emit();
}

export function showAppFeedbackFromResult(
  ok: boolean,
  message?: string,
  options?: ShowOptions,
) {
  showAppFeedback(feedbackCopyFromResult(ok, message), options);
}

export function dismissAppFeedback() {
  if (!store.open) return;
  const onDismiss = store.onDismiss;
  store = { open: false, payload: store.payload, onDismiss: undefined };
  emit();
  onDismiss?.();
}

/** Mount once in AdminShell / JudgeShell so feedback is never trapped under a Dialog. */
export function AppFeedbackHost() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <FeedbackDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) dismissAppFeedback();
      }}
      tone={state.payload.tone}
      title={state.payload.title}
      description={state.payload.description}
      actionLabel={state.payload.actionLabel}
      onAction={() => {
        // onOpenChange(false) from handleAction also dismisses; avoid double onDismiss
        // by only relying on onOpenChange. Keep onAction empty of side effects.
      }}
    />
  );
}
