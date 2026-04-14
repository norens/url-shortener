import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  GoneError,
  InternalError,
  LimitReachedError,
  NotFoundError,
  RateLimitError,
} from "../errors";

describe("Error hierarchy", () => {
  it("AppError has correct statusCode and message", () => {
    const err = new AppError(418, "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err.name).toBe("AppError");
    expect(err).toBeInstanceOf(Error);
  });

  it("NotFoundError has statusCode 404", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err).toBeInstanceOf(AppError);
  });

  it("ForbiddenError has statusCode 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err).toBeInstanceOf(AppError);
  });

  it("ConflictError has statusCode 409", () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Conflict");
    expect(err).toBeInstanceOf(AppError);
  });

  it("GoneError has statusCode 410", () => {
    const err = new GoneError();
    expect(err.statusCode).toBe(410);
    expect(err.message).toBe("Gone");
    expect(err).toBeInstanceOf(AppError);
  });

  it("RateLimitError has statusCode 429 and retryAfter", () => {
    const err = new RateLimitError("Too fast", 30);
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe("Too fast");
    expect(err.retryAfter).toBe(30);
    expect(err).toBeInstanceOf(AppError);
  });

  it("LimitReachedError has statusCode 429", () => {
    const err = new LimitReachedError();
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe("Limit reached");
    expect(err).toBeInstanceOf(AppError);
  });

  it("InternalError has statusCode 500", () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("Internal server error");
    expect(err).toBeInstanceOf(AppError);
  });

  it("all error classes extend AppError", () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
    expect(new ConflictError()).toBeInstanceOf(AppError);
    expect(new GoneError()).toBeInstanceOf(AppError);
    expect(new RateLimitError()).toBeInstanceOf(AppError);
    expect(new LimitReachedError()).toBeInstanceOf(AppError);
    expect(new InternalError()).toBeInstanceOf(AppError);
  });
});
