import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRules } from "@/lib/queries/rules";
import { getDecisionBodies, getAppliesTo, getPersonas } from "@/lib/queries/lookups";
import { getAllDocumentsSummary } from "@/lib/queries/documents";
import { PersonalWrapper } from "./personal-wrapper";

export default async function PersonalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.groupName === "admin";

  // Fetch data sequentially to avoid exhausting DB connection pool
  const rules = await getRules({
    groupId: 2,
    showArchived: true,
    isAdmin,
    userCategory: session.user.category,
  });
  const [decisionBodies, categories] = await Promise.all([getDecisionBodies(), getAppliesTo()]);
  const personas = await getPersonas();
  const allDocuments = isAdmin ? await getAllDocumentsSummary() : [];

  return (
    <PersonalWrapper
      allRules={rules}
      decisionBodies={decisionBodies}
      categories={categories}
      personas={personas}
      isAdmin={isAdmin}
      userId={session.user.id}
      userCategory={session.user.category}
      allDocuments={allDocuments}
    />
  );
}
