import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const DOCX_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

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

  // Convert DOCX to HTML for browser preview
  if (DOCX_TYPES.includes(doc.mime_type)) {
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(doc.file_data) });
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 800px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #1a1a1a; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  td, th { border: 1px solid #ddd; padding: 8px; }
  img { max-width: 100%; }
</style></head><body>${result.value}</body></html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Convert XLSX to HTML for browser preview
  if (XLSX_TYPES.includes(doc.mime_type)) {
    const workbook = XLSX.read(Buffer.from(doc.file_data), { type: "buffer" });
    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const table = XLSX.utils.sheet_to_html(sheet);
      return `<h2>${name}</h2>${table}`;
    }).join("");
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px; line-height: 1.5; color: #1a1a1a; }
  h2 { margin: 1.5em 0 0.5em; font-size: 1.1em; color: #444; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1.5em; font-size: 0.9em; }
  td, th { border: 1px solid #ddd; padding: 6px 10px; text-align: left; white-space: nowrap; }
  th { background: #f5f5f5; font-weight: 600; }
  tr:hover { background: #fafafa; }
</style></head><body>${sheets}</body></html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(doc.file_data, {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.file_name)}"`,
      "Content-Length": String(doc.file_data.length),
    },
  });
}
