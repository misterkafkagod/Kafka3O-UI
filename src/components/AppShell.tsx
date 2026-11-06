import type { ReactNode } from "react";
import { Link, useLocation, useMatch } from "react-router";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import { findGatewayById } from "../config/findGatewayById";
import type { GatewayCredentials } from "../gateway/GatewayCredentials";
import { useGatewayConfig } from "../hooks/useGatewayConfig";
import styles from "./AppShell.module.css";
import { GatewayCredentialsPanel } from "./GatewayCredentialsPanel";

type AppShellProps = {
  children: ReactNode;
  loadGatewayConfig: LoadGatewayConfig;
  credentials: GatewayCredentials;
};

type Breadcrumb = { label: string; to: string } | { label: string; current: true };

export function AppShell({ children, loadGatewayConfig, credentials }: AppShellProps) {
  const location = useLocation();
  const clusterMatch = useMatch({ path: "/clusters/:gatewayId", end: false });
  const topicMatch = useMatch({ path: "/clusters/:gatewayId/topics/:topicName", end: false });
  const topicsMatch = useMatch("/clusters/:gatewayId/topics");
  const consumerGroupsMatch = useMatch("/clusters/:gatewayId/consumer-groups");
  const { data: gateways } = useGatewayConfig(loadGatewayConfig);
  const gateway = clusterMatch ? findGatewayById(gateways ?? [], clusterMatch.params.gatewayId) : undefined;
  const topicName = topicMatch?.params.topicName;
  const clusterPath = gateway ? `/clusters/${encodeURIComponent(gateway.id)}` : undefined;
  const gatewayBreadcrumb: Breadcrumb | undefined =
    gateway && clusterPath
      ? !topicName && !topicsMatch && !consumerGroupsMatch
        ? { label: gateway.name, current: true }
        : { label: gateway.name, to: clusterPath }
      : undefined;
  const breadcrumbs: Breadcrumb[] = [];
  if (clusterMatch) {
    breadcrumbs.push({ label: "Clusters", to: "/" });
    if (gatewayBreadcrumb) breadcrumbs.push(gatewayBreadcrumb);
    if (topicName && clusterPath) {
      breadcrumbs.push({ label: "Topics", to: `${clusterPath}/topics` }, { label: topicName, current: true });
    } else if (topicsMatch) {
      breadcrumbs.push({ label: "Topics", current: true });
    } else if (consumerGroupsMatch) {
      breadcrumbs.push({ label: "Consumer groups", current: true });
    }
  }

  return (
    <div className={styles.shell}>
      <header>
        <h1>
          <Link to="/">Kafka3O</Link>
        </h1>
        <nav aria-label="Primary navigation">
          <Link
            to="/"
            aria-current={location.pathname === "/" ? "page" : clusterMatch ? "location" : undefined}
          >
            Clusters
          </Link>
        </nav>
        <GatewayCredentialsPanel loadGatewayConfig={loadGatewayConfig} credentials={credentials} />
      </header>
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((breadcrumb) => (
              <li key={breadcrumb.label}>
                {"current" in breadcrumb ? (
                  <span aria-current="page">{breadcrumb.label}</span>
                ) : (
                  <Link to={breadcrumb.to}>{breadcrumb.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      {children}
    </div>
  );
}
