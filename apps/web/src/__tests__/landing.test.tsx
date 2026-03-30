import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/link to render a simple <a> tag
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import LandingPage from "@/app/page";

describe("LandingPage", () => {
  it("renders the hero heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /shorten any url in seconds/i }),
    ).toBeInTheDocument();
  });

  it("renders the URL input field", () => {
    render(<LandingPage />);
    expect(
      screen.getByPlaceholderText("https://example.com/your-long-url"),
    ).toBeInTheDocument();
  });

  it("renders the Shorten button", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("button", { name: /shorten/i }),
    ).toBeInTheDocument();
  });

  it("renders the pricing plans", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Business" }),
    ).toBeInTheDocument();
  });
});
