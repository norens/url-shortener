import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import analytics from "./routes/analytics";
import links from "./routes/links";
import me from "./routes/me";
import redirect from "./routes/redirect";
import resolve from "./routes/resolve";
import shorten, { anonymousShorten } from "./routes/shorten";
import type { Env } from "./types";

export type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.onError(errorHandler);

// Global middleware
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: ["https://qurl.nazarf.dev", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth middleware for protected routes
app.use("/api/shorten", authMiddleware);
app.use("/api/links/*", authMiddleware);
app.use("/api/links", authMiddleware);
app.use("/api/analytics/*", authMiddleware);
app.use("/api/me", authMiddleware);

// Public routes (no auth)
app.route("/", anonymousShorten);

// Authenticated routes
app.route("/", shorten);
app.route("/", resolve);
app.route("/", links);
app.route("/", analytics);
app.route("/", me);

// Redirect catch-all (must be last)
app.route("/", redirect);

export default app;
