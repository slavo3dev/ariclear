import { NextResponse } from "next/server";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const supabase = await supabaseAriClearServer();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
