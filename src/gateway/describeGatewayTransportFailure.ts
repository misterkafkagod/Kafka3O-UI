export function describeGatewayTransportFailure(gatewayUrl: string): string {
  const checks = "The browser cannot determine the cause. Check the network connection, gateway availability and CORS settings.";
  return /^https:\/\//i.test(gatewayUrl)
    ? `${checks} For HTTPS, verify the gateway's certificate is trusted by this browser.`
    : checks;
}
