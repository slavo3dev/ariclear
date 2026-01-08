import { redirect } from "next/navigation";
import { supabaseAriClearServer } from "@ariclear/lib/supabase/auth/server";

type Props = {
  searchParams: { code?: string; next?: string };
};

export default async function ConfirmPage({ searchParams }: Props) {
  const code = searchParams.code; // ✅ just access directly
  const next = searchParams.next ?? "/"; // ✅ fallback

  if (!code) {
    redirect("/error?reason=missing_code");
  }

  const supabase = await supabaseAriClearServer();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect("/error?reason=expired");
  }

  redirect(next);
}
