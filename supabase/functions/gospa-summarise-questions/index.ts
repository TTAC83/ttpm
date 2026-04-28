import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripHtml = (s: string) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { objectiveId } = await req.json();
    if (!objectiveId) throw new Error("objectiveId is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // User-context client (respects RLS for read auth)
    const supaUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    // Service client for writing back
    const supaAdmin = createClient(supabaseUrl, serviceKey);

    const { data: objective, error: objErr } = await supaUser
      .from("gospa_objectives")
      .select("id, title, target_outcome, strategic_direction")
      .eq("id", objectiveId)
      .maybeSingle();
    if (objErr) throw objErr;
    if (!objective) throw new Error("Objective not found or not accessible");

    const { data: questions, error: qErr } = await supaUser
      .from("gospa_questions")
      .select("id, question_text, order_index")
      .eq("objective_id", objectiveId)
      .order("order_index", { ascending: true });
    if (qErr) throw qErr;

    const questionIds = (questions ?? []).map(q => q.id);
    let entries: any[] = [];
    if (questionIds.length) {
      const { data: ents, error: eErr } = await supaUser
        .from("gospa_question_entries")
        .select("question_id, entry_type, content")
        .in("question_id", questionIds);
      if (eErr) throw eErr;
      entries = ents ?? [];
    }

    const formatted = (questions ?? []).map((q, i) => {
      const qEntries = entries.filter(e => e.question_id === q.id);
      const insights = qEntries.filter(e => e.entry_type === "summary").map(e => stripHtml(e.content)).filter(Boolean);
      const answers = qEntries.filter(e => e.entry_type !== "summary").map(e => stripHtml(e.content)).filter(Boolean);
      return `Q${i + 1}. ${q.question_text}
Key insights: ${insights.length ? insights.join(" | ") : "(none)"}
Other notes: ${answers.length ? answers.join(" | ") : "(none)"}`;
    }).join("\n\n");

    const prompt = `Objective: ${objective.title}
Target outcome: ${objective.target_outcome ?? "(not set)"}

The team captured key insights against the GOSPA strategic questions:

${formatted || "(no questions)"}

Provide a concise strategic synthesis (max 200 words):
- What is the team's collective understanding?
- Where is conviction strong vs weak?
- What should be tested or decided first?`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a sharp McKinsey-style strategy consultant. Be direct, specific, and actionable." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Add credits to your Lovable AI workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error", r.status, t);
      throw new Error(`AI gateway error ${r.status}`);
    }

    const data = await r.json();
    const insight: string = data.choices?.[0]?.message?.content ?? "";
    if (!insight.trim()) throw new Error("Empty AI response");

    const { error: updErr } = await supaAdmin
      .from("gospa_objectives")
      .update({ ai_summary: insight })
      .eq("id", objectiveId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ insight }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gospa-summarise-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
