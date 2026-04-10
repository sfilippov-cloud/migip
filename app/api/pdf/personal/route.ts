import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllPersonalForPdf } from "@/lib/queries/rules";
import { generatePersonalPdfHtml } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const persona = req.nextUrl.searchParams.get("persona") || undefined;
  const isAdmin = session.user.groupName === "admin";
  const rules = await getAllPersonalForPdf(
    isAdmin,
    session.user.category,
    persona
  );
  const html = generatePersonalPdfHtml(rules);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="personalnye_resheniya.html"',
    },
  });
}
