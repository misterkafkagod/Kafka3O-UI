// Throwaway discovery probe for the P53 stable browser-marker protocol.
// Usage: node probe.mjs <scenario> [browser...]
//   scenarios: cookies | locks | closed-tab | dropped | cognito | all
//   browsers:  chromium firefox webkit chrome msedge (default: all five)
// Secrets come from %USERPROFILE%\.kafka3o\cognito-test.env and are never printed.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';

const PORT = 8443;
const ORIGIN = `http://localhost:${PORT}`;
const MARKER = '__Host-k3o-m';
const PRE = '__Host-k3o-pre';
const SESSION = '__Host-k3o-s';

const env = Object.fromEntries(
  fs.readFileSync(path.join(os.homedir(), '.kafka3o', 'cognito-test.env'), 'utf8')
    .split(/\r?\n/).filter((l) => /^COGNITO_[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const rand = () => b64u(crypto.randomBytes(32));
const cookiesOf = (req) => Object.fromEntries((req.headers.cookie ?? '').split(/;\s*/)
  .filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), c.slice(i + 1)]; }));

// ---- probe server state (per run) ----
let events = [];
let attempts = new Map(); // state -> { pre, marker, verifier, nonce }
const note = (e) => events.push({ t: Date.now(), ...e });

const page = (body) => `<!doctype html><meta charset="utf-8"><title>probe</title><body>${body}`;
const landing = page(`<p id="s">completing</p><script>
(async () => {
  const q = location.search; history.replaceState(null, '', '/auth/cognito/callback');
  const run = async () => { const r = await fetch('/api/sso/complete', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) });
    document.getElementById('s').textContent = 'done:' + r.status; };
  if (navigator.locks) await navigator.locks.request('k3o-marker', run); else await run();
})();</script>`);

async function form(req) {
  let raw = ''; for await (const c of req) raw += c; return raw ? JSON.parse(raw) : {};
}

async function token(params) {
  const basic = Buffer.from(`${env.COGNITO_CLIENT_ID}:${env.COGNITO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${env.COGNITO_DOMAIN}/oauth2/token`, { method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params), redirect: 'error' });
  const text = await r.text(); let json = {}; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json };
}
const claims = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
const shape = (c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Array.isArray(v) ? 'array' : typeof v]));

async function complete(req, res) {
  const c = cookiesOf(req); const { q } = await form(req);
  const p = new URLSearchParams(q); const a = attempts.get(p.get('state'));
  const r = { completeHadMarker: !!c[MARKER], completeHadPre: !!c[PRE],
    stateKnown: !!a, preMatches: !!a && c[PRE] === a.pre, markerMatches: !!a && c[MARKER] === a.marker,
    callbackParams: [...p.keys()].sort() };
  if (a && p.get('code')) {
    attempts.delete(p.get('state'));
    const t = await token({ grant_type: 'authorization_code', client_id: env.COGNITO_CLIENT_ID,
      code: p.get('code'), redirect_uri: `${ORIGIN}/auth/cognito/callback`, code_verifier: a.verifier });
    r.exchangeStatus = t.status; r.exchangeKeys = Object.keys(t.json).sort();
    const replay = await token({ grant_type: 'authorization_code', client_id: env.COGNITO_CLIENT_ID,
      code: p.get('code'), redirect_uri: `${ORIGIN}/auth/cognito/callback`, code_verifier: a.verifier });
    r.codeReplay = { status: replay.status, error: replay.json.error };
    if (t.json.id_token) {
      const id = claims(t.json.id_token);
      r.idClaimShape = shape(id);
      r.idChecks = { issMatches: id.iss === env.COGNITO_ISSUER, audMatches: id.aud === env.COGNITO_CLIENT_ID,
        tokenUse: id.token_use, nonceMatches: id.nonce === a.nonce,
        hasAdminGroup: Array.isArray(id['cognito:groups']) && id['cognito:groups'].includes('kafka3o-admins'),
        lifetimeSeconds: id.exp - id.iat };
      await new Promise((ok) => setTimeout(ok, Number(process.env.REFRESH_DELAY_MS ?? 0)));
      const f = await token({ grant_type: 'refresh_token', client_id: env.COGNITO_CLIENT_ID,
        refresh_token: t.json.refresh_token });
      r.refreshStatus = f.status; r.refreshKeys = Object.keys(f.json).sort();
      if (f.json.id_token) {
        const n = claims(f.json.id_token);
        r.refreshIdChecks = { sameIss: n.iss === id.iss, sameSub: n.sub === id.sub, sameAud: n.aud === id.aud,
          hasNonce: 'nonce' in n, iat: n.iat > id.iat ? 'later' : n.iat === id.iat ? 'equal' : 'earlier',
          authTimeKept: n.auth_time === id.auth_time, hasGroups: Array.isArray(n['cognito:groups']) };
      }
      const rotated = f.json.refresh_token ?? t.json.refresh_token;
      const basic = Buffer.from(`${env.COGNITO_CLIENT_ID}:${env.COGNITO_CLIENT_SECRET}`).toString('base64');
      const rv = await fetch(`${env.COGNITO_DOMAIN}/oauth2/revoke`, { method: 'POST',
        headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: rotated, client_id: env.COGNITO_CLIENT_ID }) });
      r.revokeStatus = rv.status;
      const after = await token({ grant_type: 'refresh_token', client_id: env.COGNITO_CLIENT_ID, refresh_token: rotated });
      r.refreshAfterRevoke = { status: after.status, error: after.json.error };
    }
  }
  note({ kind: 'complete', ...r });
  res.writeHead(200, { 'content-type': 'application/json', 'set-cookie':
    [`${PRE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,
     `${SESSION}=${rand()}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=600`] });
  res.end('{}');
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, ORIGIN); const c = cookiesOf(req);
  try {
    if (req.method === 'GET' && u.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page('<p>root</p>'));
    }
    if (req.method === 'POST' && u.pathname === '/api/browser/ensure') {
      const id = u.searchParams.get('id'); const delay = Number(u.searchParams.get('delay') ?? 0);
      const had = c[MARKER] ?? null; const minted = had ? null : rand();
      note({ kind: 'ensure', id, had, minted });
      await new Promise((r) => setTimeout(r, delay));
      if (u.searchParams.get('drop')) { note({ kind: 'drop', id }); return req.socket.destroy(); }
      const headers = minted ? { 'set-cookie': `${MARKER}=${minted}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=600` } : {};
      res.writeHead(204, headers); note({ kind: 'ensure-sent', id, minted, clientGone: req.destroyed || res.destroyed });
      return res.end();
    }
    if (req.method === 'GET' && u.pathname === '/api/browser/whoami') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ marker: c[MARKER] ?? null, names: Object.keys(c).sort() }));
    }
    if (req.method === 'POST' && u.pathname === '/api/sso/start') {
      const state = rand(), nonce = rand(), verifier = rand(), pre = rand();
      attempts.set(state, { pre, marker: c[MARKER], verifier, nonce });
      const challenge = b64u(crypto.createHash('sha256').update(verifier).digest());
      const auth = new URL(`${env.COGNITO_DOMAIN}/oauth2/authorize`);
      auth.search = new URLSearchParams({ response_type: 'code', client_id: env.COGNITO_CLIENT_ID,
        redirect_uri: `${ORIGIN}/auth/cognito/callback`, scope: 'openid', state, nonce,
        code_challenge: challenge, code_challenge_method: 'S256' });
      note({ kind: 'start', hadMarker: !!c[MARKER] });
      res.writeHead(200, { 'content-type': 'application/json',
        'set-cookie': `${PRE}=${pre}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=300` });
      return res.end(JSON.stringify({ url: auth.toString() }));
    }
    if (req.method === 'GET' && u.pathname === '/auth/cognito/callback') {
      note({ kind: 'callback-nav', hadMarker: !!c[MARKER], hadPre: !!c[PRE], hadSession: !!c[SESSION],
        secFetchSite: req.headers['sec-fetch-site'] ?? null, referer: !!req.headers.referer });
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
      return res.end(landing);
    }
    if (req.method === 'POST' && u.pathname === '/api/sso/complete') return complete(req, res);
    res.writeHead(404); res.end();
  } catch (e) { note({ kind: 'error', where: u.pathname, message: String(e.message) }); try { res.writeHead(500); res.end(); } catch {} }
});

// ---- scenarios ----
const ensureJs = ({ id, delay = 0, lock = true, drop = false }) =>
  `(async () => { const go = () => fetch('/api/browser/ensure?id=${id}&delay=${delay}${drop ? '&drop=1' : ''}', { method: 'POST' }).then(r => r.status, e => 'error');
     return ${lock} ? navigator.locks.request('k3o-marker', go) : go(); })()`;
const whoami = async (p) => (await p.request.get(`${ORIGIN}/api/browser/whoami`)).json();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const scenarios = {
  async cookies(ctx) {
    const p = await ctx.newPage(); await p.goto(`${ORIGIN}/`);
    const status = await p.evaluate(ensureJs({ id: 'c1' }));
    const after = await p.evaluate(() => fetch('/api/browser/whoami').then((r) => r.json()));
    const stored = (await ctx.cookies(ORIGIN)).map((c) => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite }));
    return { status, locksAvailable: await p.evaluate(() => !!navigator.locks),
      secureContext: await p.evaluate(() => isSecureContext),
      markerSentBack: !!after.marker, stored };
  },
  async locks(ctx) {
    const out = {};
    for (const lock of [true, false]) {
      await ctx.clearCookies(); events = [];
      const [a, b] = [await ctx.newPage(), await ctx.newPage()];
      await Promise.all([a.goto(`${ORIGIN}/`), b.goto(`${ORIGIN}/`)]);
      await Promise.all([a.evaluate(ensureJs({ id: 'A', delay: 400, lock })), b.evaluate(ensureJs({ id: 'B', delay: 0, lock }))]);
      const minted = events.filter((e) => e.kind === 'ensure' && e.minted).map((e) => e.minted);
      const final = (await a.evaluate(() => fetch('/api/browser/whoami').then((r) => r.json()))).marker;
      out[lock ? 'withLocks' : 'withoutLocks'] = { mintedCount: minted.length,
        finalIsFirstMinted: final === minted[0], finalIsLastMinted: final === minted.at(-1) };
      await a.close(); await b.close();
    }
    return out;
  },
  async 'closed-tab'(ctx) {
    await ctx.clearCookies(); events = [];
    const a = await ctx.newPage(); const b = await ctx.newPage();
    await Promise.all([a.goto(`${ORIGIN}/`), b.goto(`${ORIGIN}/`)]);
    a.evaluate(ensureJs({ id: 'A', delay: 2500 })).catch(() => {});
    await wait(500); await a.close(); // releases A's lock while its response is still pending
    await b.evaluate(ensureJs({ id: 'B' }));
    const mid = (await b.evaluate(() => fetch('/api/browser/whoami').then((r) => r.json()))).marker;
    await wait(3500);
    const final = (await b.evaluate(() => fetch('/api/browser/whoami').then((r) => r.json()))).marker;
    const mintA = events.find((e) => e.kind === 'ensure' && e.id === 'A')?.minted;
    const mintB = events.find((e) => e.kind === 'ensure' && e.id === 'B')?.minted;
    const sentA = events.find((e) => e.kind === 'ensure-sent' && e.id === 'A');
    return { bMinted: !!mintB, afterB: mid === mintB ? 'B' : mid === mintA ? 'A' : String(mid && 'other'),
      final: final === mintB ? 'B' : final === mintA ? 'A' : String(final && 'other'), aSentAfterClose: sentA ?? null };
  },
  async dropped(ctx) {
    await ctx.clearCookies(); events = [];
    const p = await ctx.newPage(); await p.goto(`${ORIGIN}/`);
    const first = await p.evaluate(ensureJs({ id: 'D', delay: 300, drop: true }));
    const afterDrop = (await whoami(p)).marker;
    const retry = await p.evaluate(ensureJs({ id: 'R' }));
    const mintR = events.find((e) => e.kind === 'ensure' && e.id === 'R')?.minted;
    const final = (await p.evaluate(() => fetch('/api/browser/whoami').then((r) => r.json()))).marker;
    return { first, markerAfterDrop: !!afterDrop, retry, finalIsRetry: final === mintR };
  },
  async cognito(ctx) {
    await ctx.clearCookies(); events = []; attempts = new Map();
    const p = await ctx.newPage(); await p.goto(`${ORIGIN}/`);
    await p.evaluate(ensureJs({ id: 'S' }));
    const { url } = await p.evaluate(() => navigator.locks.request('k3o-marker', () =>
      fetch('/api/sso/start', { method: 'POST' }).then((r) => r.json())));
    await p.goto(url);
    await p.locator('input[name="username"]').first().fill(env.COGNITO_TEST_USERNAME);
    const pw = p.locator('input[name="password"]').first();
    if (!(await pw.isVisible().catch(() => false))) {
      await p.locator('button[type="submit"]').first().click(); await pw.waitFor({ timeout: 15000 });
    }
    await pw.fill(env.COGNITO_TEST_PASSWORD);
    await p.locator('button[type="submit"]').first().click();
    await p.waitForURL(`${ORIGIN}/auth/cognito/callback`, { timeout: 30000 });
    await p.locator('#s', { hasText: 'done:' }).waitFor({ timeout: 30000 });
    const result = { urlCleaned: p.url() === `${ORIGIN}/auth/cognito/callback`,
      nav: events.find((e) => e.kind === 'callback-nav'), complete: events.find((e) => e.kind === 'complete') };
    // Provider logout, then a fresh authorize must ask for credentials again.
    const lo = new URL(`${env.COGNITO_DOMAIN}/logout`);
    lo.search = new URLSearchParams({ client_id: env.COGNITO_CLIENT_ID, logout_uri: `${ORIGIN}/` });
    await p.goto(lo.toString()); result.logoutLandedOnRoot = new URL(p.url()).pathname === '/';
    const { url: again } = await p.evaluate(() => fetch('/api/sso/start', { method: 'POST' }).then((r) => r.json()));
    await p.goto(again);
    result.loginPromptAfterLogout = await p.locator('input[name="username"]').first().isVisible({ timeout: 15000 }).catch(() => false);
    return result;
  },
};

const engines = { chromium: [chromium, {}], firefox: [firefox, {}], webkit: [webkit, {}],
  chrome: [chromium, { channel: 'chrome' }], msedge: [chromium, { channel: 'msedge' }] };

const [, , scenario = 'all', ...names] = process.argv;
const pick = names.length ? names : Object.keys(engines);
const run = scenario === 'all' ? Object.keys(scenarios) : [scenario];
await new Promise((r) => server.listen(PORT, 'localhost', r));
const report = {};
for (const name of pick) {
  const [type, opts] = engines[name];
  const browser = await type.launch(opts);
  report[name] = { version: browser.version() };
  for (const s of run) {
    const ctx = await browser.newContext();
    try { report[name][s] = await scenarios[s](ctx); } catch (e) { report[name][s] = { failed: String(e.message).split('\n')[0] }; }
    await ctx.close();
  }
  await browser.close();
}
server.close();
console.log(JSON.stringify(report, null, 2));
