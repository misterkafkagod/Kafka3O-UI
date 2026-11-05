export function secureGatewayUrl(gatewayUrl: string): string {
  let url: URL;
  try {
    url = new URL(gatewayUrl);
  } catch {
    throw new Error("Gateway URL must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Gateway URL must use HTTPS and must not contain credentials, a query, or a fragment.");
  }
  return url.href.replace(/\/+$/, "");
}
