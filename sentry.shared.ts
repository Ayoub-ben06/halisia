// Shared Sentry options. Without NEXT_PUBLIC_SENTRY_DSN the SDK stays disabled,
// so local development and forks send nothing.
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only: performance tracing and session replay are not enabled.
  tracesSampleRate: 0,
  // Portfolio data is personal: no IP address or user identity in events.
  sendDefaultPii: false,
};
