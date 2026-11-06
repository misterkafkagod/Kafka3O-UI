import { Buffer } from "node:buffer";
import { request } from "node:https";

export type PreviewCookieJar = {
  getCookieStringSync: (url: string, options: { http: true }) => string;
  setCookieSync: (cookie: string, url: string, options: { http: true }) => unknown;
};

export type PreviewRequest = {
  origin: string;
  path: string;
  method: string;
  credentials: RequestCredentials | undefined;
  cache: RequestCache | undefined;
  redirect: RequestRedirect | undefined;
  status?: number;
};

export function consolePreviewFetch(origin: string, ca: Buffer, jar: PreviewCookieJar) {
  const requests: PreviewRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    if (typeof input !== "string") throw new Error("The preview fixture accepts URL strings only");
    const url = new URL(input, origin);
    const method = init?.method ?? "GET";
    const recorded: PreviewRequest = {
      origin: url.origin, path: url.pathname, method,
      credentials: init?.credentials, cache: init?.cache, redirect: init?.redirect,
    };
    requests.push(recorded);
    if (url.origin !== origin || url.username || url.password) throw new Error("The preview requested a different origin");
    if (init?.body != null && typeof init.body !== "string") throw new Error("Unexpected preview request body");
    if (init?.signal?.aborted) throw new Error("The preview request was aborted");
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, name) => { headers[name] = value; });
    const cookie = jar.getCookieStringSync(url.href, { http: true });
    if (cookie) headers.cookie = cookie;
    if (method !== "GET" && method !== "HEAD") headers.origin = origin;
    return new Promise<Response>((resolve, reject) => {
      const outgoing = request(url, { method, headers, ca, rejectUnauthorized: true, agent: false }, (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.once("error", reject);
        incoming.once("end", () => {
          try {
            for (const value of incoming.headers["set-cookie"] ?? []) {
              jar.setCookieSync(value, url.href, { http: true });
            }
            const status = incoming.statusCode;
            if (status === undefined || (status >= 300 && status < 400)) {
              throw new Error("The preview fixture received an unexpected redirect or status");
            }
            recorded.status = status;
            const responseHeaders = new Headers();
            for (const [name, value] of Object.entries(incoming.headers)) {
              if (name === "set-cookie" || value === undefined) continue;
              if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(name, item));
              else responseHeaders.set(name, value);
            }
            const body = status === 204 ? null : Buffer.concat(chunks).toString("utf8");
            resolve(new Response(body, { status, headers: responseHeaders }));
          } catch (error) {
            reject(error);
          }
        });
      });
      const abort = () => outgoing.destroy(new Error("The preview request was aborted"));
      init?.signal?.addEventListener("abort", abort, { once: true });
      outgoing.once("close", () => init?.signal?.removeEventListener("abort", abort));
      outgoing.once("error", reject);
      outgoing.setTimeout(15_000, () => outgoing.destroy(new Error("The preview request timed out")));
      if (typeof init?.body === "string") outgoing.write(init.body);
      outgoing.end();
    });
  };
  return { fetch, requests };
}
