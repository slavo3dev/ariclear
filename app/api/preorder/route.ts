// app/api/preorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseMailServer } from "@ariclear/lib/supabase/mail/server";

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

    const { data, error } = await supabaseMailServer
      .from("mailcollection")
      .insert([{ email: emailClean, url: urlClean, sourceURL }])
      .select()
      .limit(1);

    if (error) {
      // 👇 UNIQUE constraint
      if (error.code === "23505") {
        return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
      }

      return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
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
