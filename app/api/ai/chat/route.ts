import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function proxyToN8n(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.N8N_AI_CHAT_URL;
  if (!url) {
    return NextResponse.json(
      { error: "AI chat service not configured" },
      { status: 503 }
    );
  }

  try {
    const method = req.method;
    let targetUrl = url;
    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method === "POST") {
      const body = await req.json();
      console.log("AI chat proxy →", method, targetUrl, JSON.stringify(body).slice(0, 500));
      fetchOptions.body = JSON.stringify(body);
    } else {
      const params = req.nextUrl.searchParams.toString();
      if (params) targetUrl += (targetUrl.includes("?") ? "&" : "?") + params;
      console.log("AI chat proxy →", method, targetUrl);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();
    console.log("AI chat proxy ←", response.status, contentType, responseText.slice(0, 200));

    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data, { status: response.status });
      } catch {
        // Not valid JSON despite content-type
      }
    }

    return new NextResponse(responseText, {
      status: response.status,
      headers: { "Content-Type": contentType || "text/plain" },
    });
  } catch (err) {
    console.error("AI chat proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach AI chat service" },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  return proxyToN8n(req);
}

export async function POST(req: NextRequest) {
  return proxyToN8n(req);
}
