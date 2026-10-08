import * as Sentry from "@sentry/nextjs";

/**
 * Reports a handled error (caught in a cron or API route) to Sentry, with
 * context, and logs it. Unhandled errors are captured automatically.
 */
export function reportError(error: unknown, context: string, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, message);
  Sentry.captureException(error instanceof Error ? error : new Error(message), { tags: { context }, extra });
}

/** Reports the per-item failures of a cron run (emails, screenings) as one Sentry event. */
export function reportFailures(context: string, failures: { id: string; error: string }[]) {
  if (!failures.length) return;
  console.error(`[${context}] ${failures.length} échec(s)`, failures.slice(0, 5));
  Sentry.captureMessage(`${context} : ${failures.length} échec(s)`, { level: "warning", tags: { context }, extra: { failures: failures.slice(0, 50) } });
}
