import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseAriClearServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
