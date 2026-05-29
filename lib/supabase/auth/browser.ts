import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing PUBLIC Supabase env vars.");
}

export const supabaseAriClear = createClient(url, anonKey);
