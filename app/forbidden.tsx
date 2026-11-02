"use client";

import { PermissionDenied } from "@/components/shared/ui-states";

export default function ForbiddenPage() {
  return (
    <PermissionDenied
      title="Permission denied"
      description="Your account doesn’t have access to this area of CEDC Expo. Return to your dashboard, or ask an administrator if you need elevated access."
      homeHref="/login"
      homeLabel="Back to login"
    />
  );
}
