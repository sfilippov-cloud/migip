import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllDocuments } from "@/lib/queries/documents";
import { getDecisionBodies } from "@/lib/queries/lookups";
import { DocumentsClient } from "./documents-client";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.groupName !== "admin") {
    redirect("/rules");
  }

  const [documents, decisionBodies] = await Promise.all([
    getAllDocuments(),
    getDecisionBodies(),
  ]);

  return (
    <DocumentsClient
      documents={documents}
      decisionBodies={decisionBodies}
    />
  );
}
