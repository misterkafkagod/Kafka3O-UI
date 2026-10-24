import { Link } from "react-router";

export function ClusterNotFound({ gatewayId }: { gatewayId: string | undefined }) {
  return (
    <main>
      <h2>Cluster not found</h2>
      <p>No gateway with ID "{gatewayId}" is configured.</p>
      <Link to="/">Back to all clusters</Link>
    </main>
  );
}
