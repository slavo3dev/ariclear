import { NextResponse } from "next/server";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/";

  if (!token_hash || type !== "recovery") {
    return NextResponse.redirect(new URL("/error?reason=invalid", url.origin));
  }

  const supabase = await supabaseAriClearServer();

  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash,
  });

  if (error) {
    return NextResponse.redirect(new URL("/error?reason=expired", url.origin));
  }

  // 🔥 Session cookie is now set automatically
  return NextResponse.redirect(new URL(next, url.origin));
}
