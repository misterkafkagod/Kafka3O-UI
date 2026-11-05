export type GatewayCredentials = {
  read: (gatewayUrl: string) => string | null;
  save: (gatewayUrl: string, token: string) => void;
  clear: (gatewayUrl: string) => void;
};
