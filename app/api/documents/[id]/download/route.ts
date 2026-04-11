import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const docId = Number(id);
  if (isNaN(docId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const doc = await prisma.uploaded_documents.findUnique({
    where: { id: docId },
    select: { file_data: true, file_name: true, mime_type: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(doc.file_data, {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.file_name)}"`,
      "Content-Length": String(doc.file_data.length),
    },
  });
}
