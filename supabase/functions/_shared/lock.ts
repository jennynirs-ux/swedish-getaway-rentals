import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Short locks in public.job_locks, so that only one payout run runs at a time
// and only one function at a time moves a host's Stripe money (the payout job,
// a cancellation, a refund webhook). Without them, a refund reversed from a
// booking's transfer while the payout job is paying that booking out with the
// figures it read a moment earlier takes another booking's money. A lock
// expires by itself, so a function stopped midway blocks no one for long.

/** Longer than an edge function may run (400 s) */
const LOCK_TTL_MS = 7 * 60 * 1000;
/** How long a cancellation or webhook waits for the payout job to finish with the host */
export const HOST_LOCK_WAIT_MS = 10_000;

export interface Lock {
  release(): Promise<void>;
}

/** Error code for "someone else holds the lock": nothing was done, and trying again later is safe */
export const LOCK_BUSY = "lock_busy";
export const lockBusyError = (message: string) => Object.assign(new Error(message), { code: LOCK_BUSY });

/** Why a host's money is locked, for messages */
export const HOST_LOCK_BUSY_TEXT =
  "Another function is moving this host's money right now (the payout job, a cancellation or a refund)";

/** One host's Stripe money (a booking without a host is locked on its own) */
export const hostMoneyLock = (hostId: string | null | undefined, bookingId: string) =>
  `host-money:${hostId ?? `booking:${bookingId}`}`;

/** Takes the lock, waiting up to waitMs for it; null if someone else still holds it. release() may be called more than once. */
export async function takeLock(supabase: SupabaseClient, name: string, waitMs = 0): Promise<Lock | null> {
  const owner = crypto.randomUUID();
  const giveUpAt = Date.now() + waitMs;
  for (;;) {
    // An expired lock belonged to a function that was stopped midway
    const { error: expiredError } = await supabase.from("job_locks").delete().eq("id", name).lt("expires_at", new Date().toISOString());
    if (expiredError) throw new Error(`Clearing the expired lock ${name} failed: ${expiredError.message}`);
    const { error } = await supabase
      .from("job_locks")
      .insert({ id: name, owner, expires_at: new Date(Date.now() + LOCK_TTL_MS).toISOString() });
    if (!error) {
      let released = false;
      return {
        release: async () => {
          if (released) return;
          released = true;
          const { error: releaseError } = await supabase.from("job_locks").delete().eq("id", name).eq("owner", owner);
          // It expires on its own
          if (releaseError) console.error("[LOCK] Releasing", name, "failed:", releaseError.message);
        },
      };
    }
    if (error.code !== "23505") throw new Error(`Taking the lock ${name} failed: ${error.message}`);
    const left = giveUpAt - Date.now();
    if (left <= 0) return null;
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, left)));
  }
}
