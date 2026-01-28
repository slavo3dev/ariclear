import { NextResponse } from "next/server";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/error?reason=missing_code", req.url)
    );
  }

  const supabase = await supabaseAriClearServer();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/error?reason=invalid_code", req.url)
    );
  }

  return NextResponse.redirect(new URL(next, req.url));
}
