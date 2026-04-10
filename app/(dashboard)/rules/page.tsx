import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRules } from "@/lib/queries/rules";
import { getSections, getRuleTypes, getDecisionBodies, getAppliesTo } from "@/lib/queries/lookups";
import { RulesWrapper } from "./rules-wrapper";

export default async function RulesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.groupName === "admin";

  // Fetch ALL rules for group_id=1 once, including archived
  const [rules, sections, ruleTypes, decisionBodies, categories] =
    await Promise.all([
      getRules({
        groupId: 1,
        showArchived: true,
        isAdmin,
        userCategory: session.user.category,
      }),
      getSections(),
      getRuleTypes(),
      getDecisionBodies(),
      getAppliesTo(),
    ]);

  return (
    <RulesWrapper
      allRules={rules}
      sections={sections}
      ruleTypes={ruleTypes}
      decisionBodies={decisionBodies}
      categories={categories}
      isAdmin={isAdmin}
      groupId={1}
      userId={session.user.id}
      userCategory={session.user.category}
    />
  );
}

