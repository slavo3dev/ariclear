import { NextRequest, NextResponse } from "next/server";
import { supabaseAriClearServer } from "@/lib/supabase/auth/server";
import { safeFetch, UnsafeUrlError } from "@/lib/security/safeFetch";
import { rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await supabaseAriClearServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Monitor page checks up to a handful of URLs at once
  const limit = rateLimit(`check-site:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many checks. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const start = Date.now();
  try {
    const res = await safeFetch(url, {
      timeoutMs: 7000,
      readBody: false,
      headers: { "User-Agent": "AriClear-Monitor/1.0" },
    });
    const responseTime = parseFloat(((Date.now() - start) / 1000).toFixed(3));
    return NextResponse.json({ statusCode: res.status, responseTime });
  } catch (err: unknown) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ statusCode: null, responseTime: null, error: msg });
  }
}
