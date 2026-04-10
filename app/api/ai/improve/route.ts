import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.N8N_AI_IMPROVE_URL;
  if (!url) {
    return NextResponse.json(
      { error: "AI improve service not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request_type: "improve", ...body }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
