// Throwaway discovery probe: does Chromium keep __Host- Secure cookies on http://localhost and send them back?
import { createServer } from "node:http";
import { chromium } from "playwright";

const seen = [];
const server = createServer((request, response) => {
  seen.push({ path: request.url, cookie: request.headers.cookie ?? "", origin: request.headers.origin ?? "" });
  if (request.url === "/set") {
    response.setHeader("Set-Cookie", [
      "__Host-kafka3o_session=s1; Secure; HttpOnly; Path=/; SameSite=Strict",
      "__Host-kafka3o_csrf=c1; Secure; Path=/; SameSite=Strict",
    ]);
  }
  response.setHeader("Content-Type", "text/html");
  response.end("<p>ok</p>");
});
await new Promise((resolve) => server.listen(5299, "127.0.0.1", resolve));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5299/set");
await page.goto("http://localhost:5299/check");
const readable = await page.evaluate(() => document.cookie);
const status = await page.evaluate(async () => (await fetch("/api", { method: "POST", credentials: "same-origin" })).status);
console.log(JSON.stringify({ secureContext: await page.evaluate(() => window.isSecureContext), readableCookie: readable,
  checkRequestCookie: seen.find((entry) => entry.path === "/check")?.cookie, fetchOrigin: seen.find((entry) => entry.path === "/api")?.origin,
  fetchCookie: seen.find((entry) => entry.path === "/api")?.cookie, fetchStatus: status }, null, 1));
await browser.close();
server.close();
