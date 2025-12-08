// app/api/preorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabaseServer"; // adjust path if needed

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, url, sourceURL } = body ?? {};

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Basic server-side sanitation/trim
    const emailClean = email.trim().toLowerCase();
    const urlClean =
      typeof url === "string" && url.trim().length ? url.trim() : null;
    const siteUrlClean =
      typeof sourceURL === "string" && sourceURL.trim().length > 0
        ? sourceURL.trim()
        : null;

    const { data, error } = await supabaseServer
      .from("mailcollection")
      .insert([{ email: emailClean, url: urlClean, sourceURL: siteUrlClean }])
      .select()
      .limit(1);

    if (error) {
      // If you expect unique constraint errors, check error.message/code here
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, row: data?.[0] ?? null },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
