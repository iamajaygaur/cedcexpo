import { PrivacyPolicyContent } from "@/components/shared/privacy-policy-content";

export const metadata = {
  title: "Privacy Policy",
};

export default function JudgePrivacyPage() {
  return <PrivacyPolicyContent linkBase="/judge" />;
}
