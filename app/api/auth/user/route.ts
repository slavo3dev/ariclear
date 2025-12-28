import { NextResponse } from "next/server";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

export async function GET() {
  const supabase = await supabaseAriClearServer();
  const { data } = await supabase.auth.getUser();

  return NextResponse.json({ user: data.user ?? null });
}
