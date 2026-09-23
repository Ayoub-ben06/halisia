import "server-only";

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Per-instance fixed window: on serverless each instance keeps its own
// counters, which bounds abuse without requiring an external store.
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) buckets.forEach((value, entry) => { if (value.resetAt <= now) buckets.delete(entry); });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** 429 response when the caller's IP exceeded `limit` calls to `name` in the window, otherwise null. */
export function tooManyRequests(request: Request, name: string, limit: number, windowMs: number): NextResponse | null {
  const { allowed, retryAfterSeconds } = rateLimit(`${name}:${clientIp(request)}`, limit, windowMs);
  if (allowed) return null;
  return NextResponse.json({ error: "Trop de requêtes. Réessayez dans un instant." }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}
