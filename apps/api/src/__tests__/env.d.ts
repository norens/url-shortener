import type { Env } from "../index";

declare module "cloudflare:workers" {
  interface ProvidedEnv extends Env {}
}
