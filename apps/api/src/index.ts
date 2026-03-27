import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import shorten from "./routes/shorten";
import resolve from "./routes/resolve";
import redirect from "./routes/redirect";
import links from "./routes/links";
import analytics from "./routes/analytics";
import { authMiddleware } from "./middleware/auth";

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: ["https://qurl.nazarf.dev", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth middleware for protected routes
app.use("/api/shorten", authMiddleware);
app.use("/api/links/*", authMiddleware);
app.use("/api/links", authMiddleware);
app.use("/api/analytics/*", authMiddleware);

// Routes
app.route("/", shorten);
app.route("/", resolve);
app.route("/", links);
app.route("/", analytics);

// Redirect catch-all (must be last)
app.route("/", redirect);

export default app;
