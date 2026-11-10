import { useContext } from "react";
import type { GatewayEntry } from "../gateway/types";
import { GatewayConnectionContext } from "./GatewayConnectionContext";

export function GatewayCredentialAction({ gateway }: { gateway: GatewayEntry }) {
  const openConnection = useContext(GatewayConnectionContext);
  if (openConnection === null) return null;
  if (!openConnection) {
    throw new Error("Gateway credential actions require a connection panel provider.");
  }
  return (
    <button type="button" aria-label={`Manage credentials for ${gateway.name}`} onClick={() => openConnection(gateway.id)}>
      Manage credentials
    </button>
  );
}
