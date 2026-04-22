import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithTimeout(url: string, accessKey: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "X-API-Key": accessKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hostUrl = Deno.env.get("VPS_AGENT_URL") ?? Deno.env.get("MONITOR_HOST_URL");
    const accessKey = Deno.env.get("VPS_AGENT_KEY") ?? Deno.env.get("MONITOR_ACCESS_KEY");

    if (!hostUrl || !accessKey) {
      return new Response(
        JSON.stringify({ error: "Monitor not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${hostUrl}/status`;
    console.log("Connecting to:", targetUrl);

    let response: Response | null = null;
    let lastError: any = null;

    // Try up to 2 times (retry once on failure - helps with cold starts)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const timeout = attempt === 1 ? 30000 : 20000;
        response = await fetchWithTimeout(targetUrl, accessKey, timeout);
        break;
      } catch (e: any) {
        lastError = e;
        console.log(`Attempt ${attempt} failed:`, e.message);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    if (!response) {
      const msg = lastError?.name === "AbortError"
        ? "انتهت مهلة الاتصال بالسيرفر. تحقق من أن الـ Agent يعمل وأن البورت 8050 مفتوح."
        : `فشل الاتصال: ${lastError?.message ?? "unknown"}`;
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ error: `Agent returned ${response.status}: ${text}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Connection failed: ${error.message}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
