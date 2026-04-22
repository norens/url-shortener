import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const downloadQrPng = vi.fn();

vi.mock("@/lib/qr-download", () => ({
  downloadQrPng: (...args: unknown[]) => downloadQrPng(...args),
}));

import { DownloadQrButton } from "@/components/links/DownloadQrButton";

describe("DownloadQrButton", () => {
  beforeEach(() => {
    downloadQrPng.mockReset();
  });

  it("renders a button with an accessible label", () => {
    render(<DownloadQrButton shortCode="abc123" />);
    const btn = screen.getByRole("button", {
      name: /download qr code for abc123/i,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("title", "Download QR code");
  });

  it("calls downloadQrPng with the short code and 1024 size on click", async () => {
    downloadQrPng.mockResolvedValueOnce(undefined);
    render(<DownloadQrButton shortCode="abc123" />);
    const btn = screen.getByRole("button", {
      name: /download qr code for abc123/i,
    });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(downloadQrPng).toHaveBeenCalledTimes(1);
    });
    const callArgs = downloadQrPng.mock.calls[0][0];
    expect(callArgs.shortCode).toBe("abc123");
    expect(callArgs.size).toBe(1024);
    expect(typeof callArgs.apiBaseUrl).toBe("string");
    expect(callArgs.apiBaseUrl.length).toBeGreaterThan(0);
  });

  it("surfaces the error message in the title attribute on failure", async () => {
    downloadQrPng.mockRejectedValueOnce(new Error("boom"));
    render(<DownloadQrButton shortCode="abc123" />);
    const btn = screen.getByRole("button", {
      name: /download qr code for abc123/i,
    });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toHaveAttribute("title", "boom");
    });
  });
});
