export function parseDeviceType(
  userAgent: string | null,
): "mobile" | "desktop" | "tablet" | "unknown" {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua))
    return "mobile";
  if (/bot|crawler|spider|crawling/.test(ua)) return "unknown";

  return "desktop";
}
