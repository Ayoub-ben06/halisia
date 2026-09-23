import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.CRON_SECRET;
  if (!value) throw new Error("CRON_SECRET est requis.");
  return value;
}

function sign(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("base64url");
}

/** Jeton signé permettant de se désabonner sans être connecté. */
export function createUnsubscribeToken(userId: string) {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [encodedUserId, signature] = token.split(".");
  if (!encodedUserId || !signature) return null;

  const userId = Buffer.from(encodedUserId, "base64url").toString("utf8");
  const expected = Buffer.from(sign(userId));
  const received = Buffer.from(signature);

  if (expected.length !== received.length) return null;
  return timingSafeEqual(expected, received) ? userId : null;
}
