import { Link } from "react-router";

type ClusterTabsProps = {
  gatewayId: string;
  view: "brokers" | "topics";
};

export function ClusterTabs({ gatewayId, view }: ClusterTabsProps) {
  return (
    <nav aria-label="Cluster sections">
      <Link to={`/clusters/${gatewayId}`} aria-current={view === "brokers" ? "page" : undefined}>
        Brokers
      </Link>{" "}
      <Link to={`/clusters/${gatewayId}/topics`} aria-current={view === "topics" ? "page" : undefined}>
        Topics
      </Link>
    </nav>
  );
}
