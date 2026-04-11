import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRules } from "@/lib/queries/rules";
import { getSections, getRuleTypes, getDecisionBodies, getAppliesTo } from "@/lib/queries/lookups";
import { getAllDocumentsSummary } from "@/lib/queries/documents";
import { RulesWrapper } from "./rules-wrapper";

export default async function RulesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.groupName === "admin";

  // Fetch data sequentially to avoid exhausting DB connection pool
  const rules = await getRules({
    groupId: 1,
    showArchived: true,
    isAdmin,
    userCategory: session.user.category,
  });
  const [sections, ruleTypes] = await Promise.all([getSections(), getRuleTypes()]);
  const [decisionBodies, categories] = await Promise.all([getDecisionBodies(), getAppliesTo()]);
  const allDocuments = isAdmin ? await getAllDocumentsSummary() : [];

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
      allDocuments={allDocuments}
    />
  );
}

