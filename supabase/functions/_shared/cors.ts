/**
 * Shared CORS configuration for all edge functions.
 * Uses SITE_URL env var for origin validation — no hardcoded domains.
 */

/**
 * Get allowed origins from environment. Falls back to SITE_URL only.
 * Never includes localhost in production.
 */
function getAllowedOrigins(): string[] {
  const siteUrl = Deno.env.get("SITE_URL");
  const origins: string[] = [];

  if (siteUrl) {
    origins.push(siteUrl.replace(/\/$/, ""));
  }

  return origins;
}

/**
 * Build CORS headers with proper origin validation.
 * Returns the request's origin if it's in the allowed list,
 * otherwise returns the SITE_URL (or empty string).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = getAllowedOrigins();
  const resolvedOrigin = allowed.includes(origin) ? origin : (allowed[0] || "");

  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle CORS preflight. Returns Response if OPTIONS, otherwise null.
 */
export function handleCorsPreflght(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
