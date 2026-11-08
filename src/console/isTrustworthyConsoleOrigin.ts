// isTrustworthyConsoleOrigin accepts an HTTPS origin, or exactly http://localhost[:port], which browsers treat as a
// secure context (the forwarded EKS-D test front); any other plain-HTTP origin is refused.
export function isTrustworthyConsoleOrigin(base: URL): boolean {
  return base.protocol === "https:" || (base.protocol === "http:" && base.hostname === "localhost");
}
