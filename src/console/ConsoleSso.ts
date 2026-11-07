import type { ConsoleSession } from "./ConsoleSession";

export const cognitoCallbackPath = "/auth/cognito/callback";

export type ConsoleSsoRequest = {
  method: "GET" | "POST";
  path: "/api/session/cognito" | "/api/session/browser" | "/api/session/cognito/start" | "/api/session/cognito/callback" | "/api/session/logout";
  body?: unknown;
  csrf?: boolean;
};

export type ConsoleSsoTransport = (request: ConsoleSsoRequest) => Promise<Response>;

export type ConsoleSsoClient = {
  available: () => Promise<boolean>;
  start: () => Promise<string>;
  complete: (query: string) => Promise<ConsoleSession>;
  signOut: () => Promise<string | null>;
};

export type ConsoleBrowser = {
  path: string;
  query: string;
  replace: (path: string) => void;
  assign: (url: string) => void;
};
