import { redirect } from "next/navigation";

/** Criteria are fixed for CEDC — no admin editor. */
export default function CriteriaPage() {
  redirect("/admin/settings");
}
