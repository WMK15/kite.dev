import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/env/server";

export function createSupabaseAdminClient() {
  return createClient(
    serverEnv.SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
