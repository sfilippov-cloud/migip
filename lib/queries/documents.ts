import { prisma } from "@/lib/db";

export async function getAllDocuments() {
  return prisma.uploaded_documents.findMany({
    select: {
      id: true,
      title: true,
      file_name: true,
      file_size: true,
      mime_type: true,
      decision_body_id: true,
      decision_date: true,
      status: true,
      uploaded_by: true,
      created_at: true,
      decision_body: { select: { id: true, code: true, name: true } },
    },
    orderBy: { created_at: "desc" },
  });
}

export async function getDocumentById(id: number) {
  return prisma.uploaded_documents.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      file_name: true,
      file_size: true,
      mime_type: true,
      decision_body_id: true,
      decision_date: true,
      extracted_text: true,
      status: true,
      created_at: true,
      decision_body: { select: { id: true, code: true, name: true } },
    },
  });
}

export async function getDocumentsByRule(ruleUid: number) {
  return prisma.rule_documents.findMany({
    where: { rule_uid: ruleUid },
    select: {
      document: {
        select: {
          id: true,
          title: true,
          file_name: true,
          mime_type: true,
          decision_body_id: true,
          decision_date: true,
          decision_body: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
}

export async function getAllDocumentsSummary() {
  return prisma.uploaded_documents.findMany({
    select: {
      id: true,
      title: true,
      file_name: true,
      decision_date: true,
      decision_body: { select: { id: true, code: true, name: true } },
    },
    orderBy: { created_at: "desc" },
  });
}
