const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { objective, questions, strategicDirection } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Objective: ${objective?.title}\nStrategic Direction: ${strategicDirection ?? "(not set)"}\n\nQuestion answers:\n${
      (questions || []).map((q: any) => `Q: ${q.question_text}\nA: ${q.answer ?? "blank"}`).join("\n\n")
    }\n\nPropose 3-5 distinct strategies to achieve this objective. Each strategy must include: a short title, a 1-sentence rationale, and a measurable success indicator.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a strategy expert. Return structured strategies." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_strategies",
            parameters: {
              type: "object",
              properties: {
                strategies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      rationale: { type: "string" },
                      success_indicator: { type: "string" },
                    },
                    required: ["title", "rationale", "success_indicator"],
                  },
                },
              },
              required: ["strategies"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_strategies" } },
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Add credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { strategies: [] };
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
