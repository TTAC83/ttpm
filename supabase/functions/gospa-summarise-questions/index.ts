import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { objective, questions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Objective: ${objective?.title ?? ""}\n\nThe team answered the GOSPA 6 strategic questions:\n${
      (questions || []).map((q: any, i: number) =>
        `${i + 1}. ${q.question_text}\nAnswer: ${q.answer ?? "(blank)"}\nConfidence: ${q.confidence ?? "n/a"}/10`
      ).join("\n\n")
    }\n\nProvide a concise strategic insight (max 150 words): What is the team's collective understanding? Where is conviction strong vs weak? What should be tested first?`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a sharp McKinsey-style strategy consultant. Be direct, specific, and actionable." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Add credits to Lovable AI workspace" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const insight = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ insight }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
