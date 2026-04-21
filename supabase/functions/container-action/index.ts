import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ACTIONS = new Set(["start", "stop", "restart", "remove", "logs"]);
// Container ID/name: docker allows [a-zA-Z0-9][a-zA-Z0-9_.-]*
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hostUrl = Deno.env.get("MONITOR_HOST_URL");
    const accessKey = Deno.env.get("MONITOR_ACCESS_KEY");
    if (!hostUrl || !accessKey) {
      return new Response(
        JSON.stringify({ error: "Monitor not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { action?: string; container?: string; tail?: number } = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const action = String(body.action ?? "").toLowerCase();
    const container = String(body.container ?? "");
    const tail = Math.min(Math.max(Number(body.tail ?? 200) | 0, 10), 2000);

    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Allowed: ${[...ALLOWED_ACTIONS].join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!ID_RE.test(container)) {
      return new Response(
        JSON.stringify({ error: "Invalid container identifier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `${hostUrl}/container/${encodeURIComponent(action)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const agentRes = await fetch(url, {
        method: "POST",
        headers: { "X-API-Key": accessKey, "Content-Type": "application/json" },
        body: JSON.stringify({ container, tail }),
        signal: controller.signal,
      });

      const text = await agentRes.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { output: text };
      }

      return new Response(JSON.stringify(payload), {
        status: agentRes.ok ? 200 : agentRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Connection failed: ${message}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
