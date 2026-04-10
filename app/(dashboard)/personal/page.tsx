import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRules } from "@/lib/queries/rules";
import { getDecisionBodies, getAppliesTo, getPersonas } from "@/lib/queries/lookups";
import { PersonalClient } from "./personal-client";

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; archived?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const showArchived = params.archived === "true";
  const isAdmin = session.user.groupName === "admin";

  const [rules, decisionBodies, categories, personas] = await Promise.all([
    getRules({
      groupId: 2,
      showArchived,
      isAdmin,
      userCategory: session.user.category,
    }),
    getDecisionBodies(),
    getAppliesTo(),
    getPersonas(),
  ]);

  // Filter by persona client-side (or we could add it to the query)
  const filteredRules = params.persona
    ? rules.filter((r) => r.persona === params.persona)
    : rules;

  return (
    <PersonalClient
      rules={filteredRules}
      decisionBodies={decisionBodies}
      categories={categories}
      personas={personas}
      currentPersona={params.persona}
      showArchived={showArchived}
      isAdmin={isAdmin}
    />
  );
}
