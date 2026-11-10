import { createContext } from "react";

// null means the build has no credentials to manage (secured Console); undefined means no provider was set up.
export const GatewayConnectionContext = createContext<((gatewayId: string) => void) | null | undefined>(undefined);
