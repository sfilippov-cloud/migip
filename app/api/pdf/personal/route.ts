import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllPersonalForPdf } from "@/lib/queries/rules";
import { generatePersonalPdf } from "@/lib/pdf-generate";

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
  const pdfBuffer = await generatePersonalPdf(rules);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="personalnye_resheniya.pdf"',
    },
  });
}
