import { PageTransition } from "@/components/shared/page-transition";

export default function JudgeTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
