import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllRulesForPdf } from "@/lib/queries/rules";
import { generateRulesPdfHtml } from "@/lib/pdf";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.groupName === "admin";
  const rules = await getAllRulesForPdf(isAdmin, session.user.category);
  const html = generateRulesPdfHtml(rules);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pravila_migipa.html"',
    },
  });
}
