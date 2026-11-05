export type GatewayWriteRequest = {
  method: "POST" | "DELETE";
  body?: string;
};

export type FetchGatewayWrite = (url: string, request: GatewayWriteRequest) => Promise<unknown>;
