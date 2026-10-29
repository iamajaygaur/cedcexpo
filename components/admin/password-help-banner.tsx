"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin/action-result";
import {
  resolveJudgePasswordHelpAction,
  type PasswordHelpRequest,
} from "@/lib/auth/judge-help";

const initial: ActionResult = { ok: true };

type PasswordHelpBannerProps = {
  requests: PasswordHelpRequest[];
};

function HelpRow({ request }: { request: PasswordHelpRequest }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    resolveJudgePasswordHelpAction,
    initial,
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state.ok && state.message) {
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, state, router]);

  const when = (() => {
    try {
      return new Date(request.requestedAt).toLocaleString();
    } catch {
      return request.requestedAt;
    }
  })();

  return (
    <li className="flex flex-col gap-2 border-t border-amber-200/80 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold text-amber-950">
          {request.fullName}{" "}
          <span className="font-normal text-amber-900/80">
            ({request.username})
          </span>
        </p>
        <p className="text-xs text-amber-900/75">
          Requested {when}
          {request.note ? ` — ${request.note}` : ""}
        </p>
        {!state.ok && state.message ? (
          <p className="text-xs text-destructive">{state.message}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="min-h-9">
          <Link href={`/admin/judges?focus=${request.judgeId}`}>
            Reset password
          </Link>
        </Button>
        <form action={formAction}>
          <input type="hidden" name="judge_id" value={request.judgeId} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="min-h-9"
            disabled={pending}
          >
            {pending ? "Clearing…" : "Mark resolved"}
          </Button>
        </form>
      </div>
    </li>
  );
}

export function PasswordHelpBanner({ requests }: PasswordHelpBannerProps) {
  if (requests.length === 0) return null;

  return (
    <section
      aria-label="Judge password help requests"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 shadow-sm"
    >
      <div className="mb-2 flex items-center gap-2">
        <KeyRound className="size-4 shrink-0" aria-hidden />
        <h2 className="text-sm font-bold tracking-tight">
          Judge password help ({requests.length})
        </h2>
      </div>
      <p className="mb-2 text-xs text-amber-900/80">
        Judges asked for a password reset at the login help form. Reset their
        password on Judges, then mark resolved.
      </p>
      <ul className="m-0 list-none p-0">
        {requests.map((request) => (
          <HelpRow key={request.judgeId} request={request} />
        ))}
      </ul>
    </section>
  );
}
