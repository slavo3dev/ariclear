import { NextResponse } from "next/server";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

export async function POST() {
  const supabase = await supabaseAriClearServer();
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
