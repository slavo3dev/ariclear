import { NextRequest, NextResponse } from "next/server";
 
export const dynamic = "force-dynamic";
 
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
 
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
      headers: { "User-Agent": "AriClear-Monitor/1.0" },
    });
    const responseTime = parseFloat(((Date.now() - start) / 1000).toFixed(3));
    return NextResponse.json({ statusCode: res.status, responseTime });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ statusCode: null, responseTime: null, error: msg });
  }
}