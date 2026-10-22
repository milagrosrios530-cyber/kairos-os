import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/server-env";
import { fetchWithSupabaseTimeout } from "@/lib/supabase/fetch-with-timeout";

export function createAdminClient() {
  const env = getServerEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: { fetch: fetchWithSupabaseTimeout },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
