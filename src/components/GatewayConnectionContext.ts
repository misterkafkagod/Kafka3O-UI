import { createContext } from "react";

export const GatewayConnectionContext = createContext<((gatewayId: string) => void) | undefined>(undefined);
