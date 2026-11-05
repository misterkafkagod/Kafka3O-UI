export function isValidGatewayToken(token: string): boolean {
  return token.length >= 32 && /^[A-Za-z0-9._~+/-]+={0,2}$/.test(token);
}
