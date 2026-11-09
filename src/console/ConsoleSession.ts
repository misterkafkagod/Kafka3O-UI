export type ConsoleAdministration = {
  access: boolean;
  audit: boolean;
};

export type ConsoleSession = {
  accountId: string;
  username: string;
  mustChangePassword: boolean;
  absoluteExpiresAt: string;
  // Reported by the session check only; undefined after sign-in until the session is inspected.
  administration?: ConsoleAdministration;
};

export type ConsoleSessionOperation =
  | { kind: "inspect" }
  | { kind: "login"; username: string; password: string }
  | { kind: "changePassword"; currentPassword: string; newPassword: string }
  | { kind: "logout" };

export type ConsoleSessionTransport = (operation: ConsoleSessionOperation, signal?: AbortSignal) => Promise<Response>;

export type ConsoleSessionClient = {
  inspect: (signal?: AbortSignal) => Promise<ConsoleSession | null>;
  signIn: (username: string, password: string) => Promise<ConsoleSession>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
};
