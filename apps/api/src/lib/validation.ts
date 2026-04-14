import { ALIAS_REGEX, MAX_ALIAS_LENGTH } from "@qurl/shared";
import { z } from "zod";

const httpUrlSchema = z
  .string()
  .url("Invalid URL format")
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Only http and https URLs are allowed" },
  );

export const shortenSchema = z.object({
  long_url: httpUrlSchema,
  alias: z
    .string()
    .max(
      MAX_ALIAS_LENGTH,
      `Alias must be at most ${MAX_ALIAS_LENGTH} characters`,
    )
    .regex(
      ALIAS_REGEX,
      "Alias can only contain letters, numbers, hyphens, and underscores",
    )
    .optional(),
  title: z.string().max(255).optional(),
  expires_at: z
    .string()
    .datetime({ offset: true })
    .refine((date) => new Date(date) > new Date(), {
      message: "Expiration date must be in the future",
    })
    .optional(),
});

export const anonymousShortenSchema = z.object({
  url: httpUrlSchema,
});

export const updateLinkSchema = z.object({
  long_url: httpUrlSchema.optional(),
  title: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
});
