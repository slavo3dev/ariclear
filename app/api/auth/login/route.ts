import { NextResponse } from "next/server";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const supabase = await supabaseAriClearServer();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    user: data.user,
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
  });
}
