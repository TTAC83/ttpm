import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error } = await sb.auth.admin.updateUserById(
    "caabf3ab-aa39-44d0-a7f9-4c796a6689d7",
    { email: "Neil.Hodson@lmsdigital.co.uk" }
  );
  return new Response(JSON.stringify({ ok: !error, error: error?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
