export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn(
      "[sentry] SENTRY_DSN not set – error tracking is disabled.",
    );
    return;
  }

  // TODO: Initialize Sentry SDK here.
  // Example:
  //   import * as Sentry from "@sentry/node";
  //   Sentry.init({ dsn, tracesSampleRate: 0.2 });
  console.info("[sentry] Sentry initialized (stub).");
}

export function captureException(err: unknown): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.error("[sentry] Untracked exception:", err);
    return;
  }

  // TODO: Forward to Sentry SDK.
  // Example:
  //   import * as Sentry from "@sentry/node";
  //   Sentry.captureException(err);
  console.error("[sentry] Captured exception (stub):", err);
}
