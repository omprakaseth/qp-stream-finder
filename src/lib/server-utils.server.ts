import { getRequest, getCookie, setCookie, getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Returns the verified user (id, emailVerified) if a valid bearer is present, else null. */
export async function optionalUser(): Promise<{ id: string; email?: string; emailVerified: boolean } | null> {
  const auth = getRequest()?.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  if (token.split(".").length !== 3) return null;
  const a = await admin();
  const { data, error } = await a.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email, emailVerified: !!data.user.email_confirmed_at };
}

export async function ipHash(): Promise<string> {
  const ip =
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("qp-ip:" + ip));
  return Array.from(new Uint8Array(buf).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

const GUEST_COOKIE = "qp_gid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Server-issued opaque guest id (HttpOnly, Secure, SameSite=Lax). Best-effort only. */
export async function guestId(): Promise<string> {
  const a = await admin();
  let id = getCookie(GUEST_COOKIE);
  if (id && UUID_RE.test(id)) {
    const { data } = await a.from("guest_sessions").select("id").eq("id", id).maybeSingle();
    if (data) {
      await a.from("guest_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", id);
      return id;
    }
  }
  id = crypto.randomUUID();
  await a.from("guest_sessions").insert({ id, ip_hash: await ipHash() });
  setCookie(GUEST_COOKIE, id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return id;
}

export async function rateLimit(bucket: string, max: number, windowSeconds: number) {
  const a = await admin();
  const { data, error } = await a.rpc("hit_rate_limit", { _bucket: bucket, _max: max, _window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit error", error.message);
    return; // fail open on limiter outage only; quota/rights still fail closed
  }
  if (data === false) throw new Error("RATE_LIMITED: Too many requests. Please wait a minute and try again.");
}

export async function audit(actorId: string | null, action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  const a = await admin();
  await a.from("audit_logs").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, details: details as never });
}

export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
