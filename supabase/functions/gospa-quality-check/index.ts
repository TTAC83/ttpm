const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { objective, strategies, plans, actions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Deterministic gap detection
    const issues: { severity: "high" | "medium" | "low"; type: string; message: string }[] = [];
    if (!objective?.owner_user_id) issues.push({ severity: "high", type: "missing_owner", message: "Objective has no owner." });
    if (!objective?.target_date) issues.push({ severity: "medium", type: "missing_date", message: "Objective has no target date." });
    if (!strategies?.length) issues.push({ severity: "high", type: "no_strategies", message: "No strategies defined." });
    (plans || []).forEach((p: any) => {
      if (!p.owner_user_id) issues.push({ severity: "medium", type: "missing_owner", message: `Plan "${p.title}" has no owner.` });
      if (!p.due_date) issues.push({ severity: "medium", type: "missing_date", message: `Plan "${p.title}" has no due date.` });
    });
    if (!actions?.length) issues.push({ severity: "high", type: "no_actions", message: "No execution actions linked." });

    // AI narrative
    const prompt = `Objective "${objective?.title}" execution snapshot:\nStrategies: ${strategies?.length || 0}\nPlans: ${plans?.length || 0}\nActions: ${actions?.length || 0}\nIssues found: ${issues.map(i => i.message).join("; ") || "none"}\n\nGive a 2-sentence executive verdict on execution health and the single most important next action.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an execution coach. Be direct." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await r.json();
    const verdict = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ issues, verdict }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
