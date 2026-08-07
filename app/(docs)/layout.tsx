import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4 md:px-6">
          <AppLogo href="/" className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              Capstone Design Expo
            </p>
            <Link
              href="/login"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6">
        {children}
      </main>
    </div>
  );
}
