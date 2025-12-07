import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceRoleKey) {
  throw new Error("Missing SUPABASE env vars.");
}

export const supabaseServer = createClient(url, serviceRoleKey, {
  // explicit: enforce server usage, no auth in this helper
  auth: { persistSession: false },
});
