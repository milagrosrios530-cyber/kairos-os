import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";
import { fetchWithSupabaseTimeout } from "@/lib/supabase/fetch-with-timeout";

export function createClient() {
  const env = getPublicEnv();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { global: { fetch: fetchWithSupabaseTimeout } },
  );
}
