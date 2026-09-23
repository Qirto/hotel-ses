import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://smkwemugjinusfpiyrpn.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_xubgYj7DdT1VI8ndyxSJ4g_QlvcRIKk";

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
