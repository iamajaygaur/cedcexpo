"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { changeOwnPasswordAction } from "@/lib/admin/actions/passwords";
import { SUPPORT_EMAIL } from "@/lib/contact";

export function AdminPasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const confirmTouched = confirmPassword.length > 0;
  const passwordsMismatch =
    confirmTouched && newPassword !== confirmPassword;

  return (
    <section className="h-full rounded-md border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-semibold">Change your password</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Update the password for your admin login (
        <span className="font-medium text-foreground">{SUPPORT_EMAIL}</span>
        ).
      </p>
      <AdminActionForm
        action={changeOwnPasswordAction}
        onSuccess={() => {
          setNewPassword("");
          setConfirmPassword("");
          router.refresh();
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="admin_current_password">Current password</Label>
          <PasswordInput
            id="admin_current_password"
            name="current_password"
            required
            minLength={8}
            autoComplete="current-password"
            className="h-10 rounded-md"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_new_password">New password</Label>
          <PasswordInput
            id="admin_new_password"
            name="new_password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 rounded-md"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_confirm_password">Confirm new password</Label>
          <PasswordInput
            id="admin_confirm_password"
            name="confirm_password"
            required
            minLength={8}
            autoComplete="new-password"
            className={
              passwordsMismatch
                ? "h-10 rounded-md border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
                : "h-10 rounded-md"
            }
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={passwordsMismatch || undefined}
          />
          {passwordsMismatch ? (
            <p role="alert" className="text-sm text-destructive">
              New passwords do not match.
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={passwordsMismatch}>
          Update password
        </Button>
      </AdminActionForm>
    </section>
  );
}
