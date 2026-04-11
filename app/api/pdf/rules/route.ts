import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllRulesForPdf } from "@/lib/queries/rules";
import { generateRulesPdf } from "@/lib/pdf-generate";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.groupName === "admin";
  const rules = await getAllRulesForPdf(isAdmin, session.user.category);
  const pdfBuffer = await generateRulesPdf(rules);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pravila_migipa.pdf"',
    },
  });
}
