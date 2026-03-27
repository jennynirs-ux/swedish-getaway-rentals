import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Key prefix to namespace different rate limiters */
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  payment: { maxRequests: 5, windowSeconds: 60, keyPrefix: "rl:payment" },
  auth: { maxRequests: 10, windowSeconds: 300, keyPrefix: "rl:auth" },
  email: { maxRequests: 3, windowSeconds: 60, keyPrefix: "rl:email" },
  api: { maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:api" },
};

/**
 * Server-side rate limiter backed by Supabase.
 * Uses an upsert-based sliding window counter in the rate_limits table.
 *
 * Requires this table (run once via migration):
 *
 *   CREATE TABLE IF NOT EXISTS public.rate_limits (
 *     key TEXT PRIMARY KEY,
 *     count INTEGER NOT NULL DEFAULT 1,
 *     window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
 *   -- No RLS policies needed: accessed only via service_role
 *   CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);
 */
export async function checkRateLimit(
  identifier: string,
  configName: keyof typeof DEFAULT_CONFIGS = "api",
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const config = { ...DEFAULT_CONFIGS[configName], ...customConfig };
  const key = `${config.keyPrefix}:${identifier}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const windowStart = new Date(
    Date.now() - config.windowSeconds * 1000
  ).toISOString();

  // Get current count within the window
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .single();

  // If no record or window expired, reset
  if (!existing || new Date(existing.window_start) < new Date(windowStart)) {
    await supabase.from("rate_limits").upsert(
      { key, count: 1, window_start: new Date().toISOString() },
      { onConflict: "key" }
    );
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  // Within window: check count
  if (existing.count >= config.maxRequests) {
    const windowEnd = new Date(
      new Date(existing.window_start).getTime() + config.windowSeconds * 1000
    );
    const retryAfterSeconds = Math.ceil(
      (windowEnd.getTime() - Date.now()) / 1000
    );
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    };
  }

  // Increment counter
  await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("key", key);

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count - 1,
  };
}

/**
 * Extracts a rate-limit identifier from request headers.
 * Prefers auth user ID, falls back to IP, then user-agent hash.
 */
export function getRateLimitIdentifier(req: Request): string {
  // Try auth token user ID
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = JSON.parse(atob(authHeader.split(".")[1]));
      if (payload.sub) return `user:${payload.sub}`;
    } catch {
      // Invalid JWT, fall through
    }
  }

  // Fall back to IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}

/**
 * Returns rate-limit HTTP headers for the response.
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  config: keyof typeof DEFAULT_CONFIGS = "api"
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(DEFAULT_CONFIGS[config].maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (result.retryAfterSeconds) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}

/**
 * Convenience: check rate limit and return 429 response if exceeded.
 * Returns null if allowed (caller should proceed).
 */
export async function enforceRateLimit(
  req: Request,
  configName: keyof typeof DEFAULT_CONFIGS = "api",
  corsHeaders: Record<string, string> = {}
): Promise<Response | null> {
  const identifier = getRateLimitIdentifier(req);
  const result = await checkRateLimit(identifier, configName);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders(result, configName),
          "Content-Type": "application/json",
        },
      }
    );
  }

  return null;
}
