import type { Context } from "hono";
import { AppError, RateLimitError } from "../errors";

export function errorHandler(err: Error, c: Context) {
  if (err instanceof RateLimitError) {
    const res = c.json({ error: err.message }, err.statusCode as any);
    if (err.retryAfter) {
      res.headers.set("Retry-After", String(err.retryAfter));
    }
    return res;
  }

  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as any);
  }

  // Unknown errors — don't leak internals
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
}
