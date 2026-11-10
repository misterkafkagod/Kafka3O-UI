import { Link } from "react-router";

type ClusterTabsProps = {
  gatewayId: string;
  view: "brokers" | "topics" | "consumer-groups" | "configuration" | "connect";
};

export function ClusterTabs({ gatewayId, view }: ClusterTabsProps) {
  const clusterPath = `/clusters/${encodeURIComponent(gatewayId)}`;
  return (
    <nav aria-label="Cluster sections">
      <Link to={`${clusterPath}/topics`} aria-current={view === "topics" ? "page" : undefined}>
        Topics
      </Link>{" "}
      <Link to={`${clusterPath}/brokers`} aria-current={view === "brokers" ? "page" : undefined}>
        Brokers
      </Link>{" "}
      <Link to={`${clusterPath}/consumer-groups`} aria-current={view === "consumer-groups" ? "page" : undefined}>
        Consumer groups
      </Link>{" "}
      <Link to={`${clusterPath}/configuration`} aria-current={view === "configuration" ? "page" : undefined}>
        Broker configuration
      </Link>{" "}
      <Link to={`${clusterPath}/connect`} aria-current={view === "connect" ? "page" : undefined}>
        Connect
      </Link>
    </nav>
  );
}
