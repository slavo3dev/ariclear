import { NextResponse } from "next/server";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const supabase = await supabaseAriClearServer();

  // Check if the user already exists before attempting signup
  const { data: existingUsers } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUsers) {
    return NextResponse.json(
      { message: "An account with this email already exists. Try logging in instead." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email`,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (data.user && data.user.identities?.length === 0) {
    return NextResponse.json(
      { message: "An account with this email already exists. Try logging in instead." },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}