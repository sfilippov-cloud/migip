import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRules } from "@/lib/queries/rules";
import { getSections, getRuleTypes, getDecisionBodies, getAppliesTo } from "@/lib/queries/lookups";
import { RulesClient } from "./rules-client";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; type?: string; archived?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const sectionId = params.section ? Number(params.section) : undefined;
  const ruleTypeId = params.type ? Number(params.type) : undefined;
  const showArchived = params.archived === "true";
  const isAdmin = session.user.groupName === "admin";

  const [rules, sections, ruleTypes, decisionBodies, categories] =
    await Promise.all([
      getRules({
        groupId: 1,
        sectionId,
        ruleTypeId,
        showArchived,
        isAdmin,
        userCategory: session.user.category,
      }),
      getSections(),
      getRuleTypes(),
      getDecisionBodies(),
      getAppliesTo(),
    ]);

  return (
    <RulesClient
      rules={rules}
      sections={sections}
      ruleTypes={ruleTypes}
      decisionBodies={decisionBodies}
      categories={categories}
      currentSectionId={sectionId}
      currentTypeId={ruleTypeId}
      showArchived={showArchived}
      isAdmin={isAdmin}
      groupId={1}
    />
  );
}
