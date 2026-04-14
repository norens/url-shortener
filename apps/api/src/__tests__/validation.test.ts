import { describe, expect, it } from "vitest";
import {
  anonymousShortenSchema,
  shortenSchema,
  updateLinkSchema,
} from "../lib/validation";

describe("shortenSchema", () => {
  it("accepts valid URL with long_url", () => {
    const result = shortenSchema.safeParse({
      long_url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing long_url", () => {
    const result = shortenSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-http URL (ftp://)", () => {
    const result = shortenSchema.safeParse({
      long_url: "ftp://files.example.com/data.zip",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional alias (max 7 chars, alphanumeric + hyphens)", () => {
    const result = shortenSchema.safeParse({
      long_url: "https://example.com",
      alias: "my-link",
    });
    expect(result.success).toBe(true);
  });

  it("rejects alias > 7 chars", () => {
    const result = shortenSchema.safeParse({
      long_url: "https://example.com",
      alias: "toolongalias",
    });
    expect(result.success).toBe(false);
  });

  it("rejects alias with invalid chars (spaces, @)", () => {
    const resultSpace = shortenSchema.safeParse({
      long_url: "https://example.com",
      alias: "my link",
    });
    expect(resultSpace.success).toBe(false);

    const resultAt = shortenSchema.safeParse({
      long_url: "https://example.com",
      alias: "my@lnk",
    });
    expect(resultAt.success).toBe(false);
  });

  it("accepts optional title", () => {
    const result = shortenSchema.safeParse({
      long_url: "https://example.com",
      title: "My Bookmark",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional expires_at (ISO datetime)", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const result = shortenSchema.safeParse({
      long_url: "https://example.com",
      expires_at: future,
    });
    expect(result.success).toBe(true);
  });

  it("rejects expires_at in the past", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = shortenSchema.safeParse({
      long_url: "https://example.com",
      expires_at: past,
    });
    expect(result.success).toBe(false);
  });
});

describe("anonymousShortenSchema", () => {
  it("accepts valid URL", () => {
    const result = anonymousShortenSchema.safeParse({
      url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = anonymousShortenSchema.safeParse({ url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects non-http URL", () => {
    const result = anonymousShortenSchema.safeParse({
      url: "ftp://files.example.com/data.zip",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLinkSchema", () => {
  it("accepts optional long_url", () => {
    const result = updateLinkSchema.safeParse({
      long_url: "https://new-url.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional title", () => {
    const result = updateLinkSchema.safeParse({
      title: "New Title",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional is_active boolean", () => {
    const result = updateLinkSchema.safeParse({
      is_active: false,
    });
    expect(result.success).toBe(true);
  });
});
