import type { GatewayEntry } from "../gateway/types";

export function ClusterCard({ gateway }: { gateway: GatewayEntry }) {
  return (
    <article aria-label={gateway.name}>
      <h2>{gateway.name}</h2>
      <p>{gateway.url}</p>
    </article>
  );
}
