import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { weekStart, objectives, decisions, blockers, metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Compile the GOSPA Weekly Review report for week starting ${weekStart}.

Objectives & RAG:
${(objectives || []).map((o: any) => `- ${o.title}: ${o.rag ?? "amber"} — ${o.update ?? "(no update)"}`).join("\n")}

Decisions made:
${(decisions || []).map((d: any) => `- ${d.title}: ${d.decision}`).join("\n") || "(none)"}

Blockers:
${(blockers || []).map((b: any) => `- [${b.severity}] ${b.title}`).join("\n") || "(none)"}

Metrics movement:
${(metrics || []).map((m: any) => `- ${m.name}: ${m.current_value}/${m.target_value} (${m.trend})`).join("\n") || "(none)"}

Produce a crisp markdown report: Executive Summary, What's On Track, What's At Risk, Decisions, Asks of Leadership, Next Week Focus. Maximum 400 words.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write executive-quality weekly reports. Crisp, no fluff." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Add credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const report = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ report }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
