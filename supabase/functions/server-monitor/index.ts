import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const targetUrl = `${hostUrl}/status`;
    console.log("Connecting to:", targetUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        headers: {
          "X-API-Key": accessKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      const msg = e.name === "AbortError"
        ? "انتهت مهلة الاتصال بالسيرفر (20 ثانية). تحقق من أن الـ Agent يعمل وأن البورت 8050 مفتوح."
        : `فشل الاتصال: ${e.message}`;
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeoutId);

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
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Connection failed: ${error.message}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
