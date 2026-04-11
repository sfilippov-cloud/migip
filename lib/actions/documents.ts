"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { extractText } from "@/lib/text-extract";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.groupName !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function uploadDocument(formData: FormData) {
  const session = await requireAdmin();

  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const decisionBodyId = formData.get("decisionBodyId") as string | null;
  const decisionDate = formData.get("decisionDate") as string | null;

  if (!file || !title) {
    throw new Error("File and title are required");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Поддерживаются только PDF, DOCX, XLSX и изображения (JPG, PNG, WebP)");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must be under 20 MB");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract text
  let extractedText: string | null = null;
  let status = "pending";
  try {
    extractedText = await extractText(buffer, file.type);
    status = "ready";
  } catch (err) {
    console.error("Text extraction failed:", err);
    status = "error";
  }

  const doc = await prisma.uploaded_documents.create({
    data: {
      title,
      file_name: file.name,
      file_data: buffer,
      file_size: file.size,
      mime_type: file.type,
      decision_body_id: decisionBodyId ? Number(decisionBodyId) : null,
      decision_date: decisionDate ? new Date(decisionDate) : null,
      extracted_text: extractedText,
      status,
      uploaded_by: Number(session.user.id),
    },
  });

  // Trigger AI embedding if text was extracted
  if (extractedText) {
    await triggerDocEmbed(doc.id);
  }

  revalidatePath("/documents");
  return doc.id;
}

export async function updateDocument(
  id: number,
  data: {
    title: string;
    decisionBodyId: number | null;
    decisionDate: string | null;
  }
) {
  await requireAdmin();

  await prisma.uploaded_documents.update({
    where: { id },
    data: {
      title: data.title,
      decision_body_id: data.decisionBodyId,
      decision_date: data.decisionDate ? new Date(data.decisionDate) : null,
    },
  });

  revalidatePath("/documents");
}

export async function deleteDocument(id: number) {
  await requireAdmin();

  // Delete embeddings first (uses vector type — raw SQL)
  await prisma.$executeRaw`DELETE FROM document_embeddings WHERE document_id = ${id}`;
  // Junction records cascade via FK, but be explicit
  await prisma.rule_documents.deleteMany({ where: { document_id: id } });
  await prisma.uploaded_documents.delete({ where: { id } });

  revalidatePath("/documents");
  revalidatePath("/rules");
  revalidatePath("/personal");
}

export async function linkDocumentToRule(documentId: number, ruleUid: number) {
  await requireAdmin();

  await prisma.rule_documents.create({
    data: { rule_uid: ruleUid, document_id: documentId },
  });

  revalidatePath("/rules");
  revalidatePath("/personal");
}

export async function unlinkDocumentFromRule(
  documentId: number,
  ruleUid: number
) {
  await requireAdmin();

  await prisma.rule_documents.delete({
    where: {
      rule_uid_document_id: { rule_uid: ruleUid, document_id: documentId },
    },
  });

  revalidatePath("/rules");
  revalidatePath("/personal");
}

export async function retriggerDocEmbed(documentId: number) {
  await requireAdmin();

  // Delete old embeddings
  await prisma.$executeRaw`DELETE FROM document_embeddings WHERE document_id = ${documentId}`;

  await triggerDocEmbed(documentId);

  revalidatePath("/documents");
}

async function triggerDocEmbed(documentId: number) {
  const url = process.env.N8N_AI_DOC_EMBED_URL;
  if (!url) return;

  try {
    const requestUrl = `${url}?document_id=${documentId}`;
    console.log(`AI doc embed → GET ${requestUrl}`);
    const response = await fetch(requestUrl);
    console.log(`AI doc embed ← ${response.status} ${response.statusText}`);
  } catch (err) {
    console.error(
      `Failed to trigger AI doc embed for document_id ${documentId}:`,
      err
    );
  }
}
