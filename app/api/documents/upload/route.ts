import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractText } from "@/lib/text-extract";

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.groupName !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const decisionBodyId = formData.get("decisionBodyId") as string | null;
  const decisionDate = formData.get("decisionDate") as string | null;

  if (!file || !title) {
    return NextResponse.json({ error: "File and title are required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Поддерживаются только PDF, DOCX, XLSX и изображения (JPG, PNG, WebP)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Файл должен быть не больше 20 МБ" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

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
    const embedUrl = process.env.N8N_AI_DOC_EMBED_URL;
    if (embedUrl) {
      try {
        await fetch(`${embedUrl}?document_id=${doc.id}`);
      } catch (err) {
        console.error(`Failed to trigger doc embed for ${doc.id}:`, err);
      }
    }
  }

  return NextResponse.json({ id: doc.id });
}
