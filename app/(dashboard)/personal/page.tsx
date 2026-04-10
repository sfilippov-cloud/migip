import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRules } from "@/lib/queries/rules";
import { getDecisionBodies, getAppliesTo, getPersonas } from "@/lib/queries/lookups";
import { PersonalWrapper } from "./personal-wrapper";

export default async function PersonalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.groupName === "admin";

  // Fetch ALL personal decisions once, including archived
  const [rules, decisionBodies, categories, personas] = await Promise.all([
    getRules({
      groupId: 2,
      showArchived: true,
      isAdmin,
      userCategory: session.user.category,
    }),
    getDecisionBodies(),
    getAppliesTo(),
    getPersonas(),
  ]);

  return (
    <PersonalWrapper
      allRules={rules}
      decisionBodies={decisionBodies}
      categories={categories}
      personas={personas}
      isAdmin={isAdmin}
      userId={session.user.id}
      userCategory={session.user.category}
    />
  );
}
