import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM = `You are Aurora, the in-platform AI analyst for the CR-SAP Odisha Sustainable Schools Intelligence Platform.

You are given a live JSON \`context\` block built from REAL Google-Form responses submitted by schools across Odisha (up to all 30 districts). The number of schools is whatever is present in the context — never assume a fixed count. The context may include:
- SHVR star ratings (0–5)
- Sustainability score, WASH composite score
- Climate hazard exposure (Cyclone, Floods, Heatwave, Drought, Landslide, etc.)
- CR-SAP, Green Plan and SDMP adoption
- District-level aggregates and rankings

If the context indicates no responses yet, say so plainly and explain that insights will appear once schools submit the form.

Your job:
1. Answer the user's question grounded in the JSON \`context\` block. Cite numbers from it.
2. Be concise, use markdown (bullets, **bold**, short paragraphs). No fluff.
3. When the user asks for a "dashboard", "chart", "visualize", "graph", "compare visually", "show me a breakdown", or anything that would clearly be better as a dashboard, ALSO call the \`generate_dashboard\` tool with 2–4 charts + 2–4 KPIs derived from the context. Otherwise do NOT call the tool.
4. Never invent fields that aren't in the context. If something is missing, say so and suggest what data would be needed.`;

const dashboardTool = {
  type: "function",
  function: {
    name: "generate_dashboard",
    description: "Render a live, in-app dashboard with KPIs and charts derived from the provided context.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        kpis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              hint: { type: "string" },
            },
            required: ["label", "value"],
            additionalProperties: false,
          },
        },
        charts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["bar", "line", "area", "pie", "radar"] },
              title: { type: "string" },
              xKey: { type: "string", description: "Name of the category key in each data row" },
              yKeys: { type: "array", items: { type: "string" } },
              data: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
            },
            required: ["type", "title", "xKey", "yKeys", "data"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "kpis", "charts"],
      additionalProperties: false,
    },
  },
};

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            messages: Msg[];
            context?: unknown;
            allowDashboard?: boolean;
          };
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });
          }
          const contextStr = body.context
            ? `\n\nLIVE PLATFORM CONTEXT (JSON):\n\`\`\`json\n${JSON.stringify(body.context).slice(0, 14000)}\n\`\`\``
            : "";
          const messages: Msg[] = [
            { role: "system", content: SYSTEM + contextStr },
            ...body.messages.slice(-20),
          ];
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages,
              tools: body.allowDashboard === false ? undefined : [dashboardTool],
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            if (res.status === 429) {
              return Response.json({ error: "AI rate limit reached. Please wait a moment and try again." }, { status: 429 });
            }
            if (res.status === 402) {
              return Response.json({ error: "AI workspace credits exhausted. Add credits in Lovable → Settings → Workspace → Usage." }, { status: 402 });
            }
            console.error("gateway error", res.status, text);
            return Response.json({ error: "AI gateway error" }, { status: 500 });
          }
          const data = await res.json();
          const choice = data?.choices?.[0]?.message ?? {};
          const content: string = choice.content ?? "";
          let dashboard: unknown = null;
          const toolCall = choice.tool_calls?.[0];
          if (toolCall?.function?.name === "generate_dashboard") {
            try {
              dashboard = JSON.parse(toolCall.function.arguments || "{}");
            } catch {
              dashboard = null;
            }
          }
          return Response.json({ content, dashboard });
        } catch (e) {
          console.error("chat handler error", e);
          return Response.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
        }
      },
    },
  },
});
