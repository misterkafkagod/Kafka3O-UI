import { useState } from "react";
import { useParams } from "react-router";
import { ClusterNotFound } from "../components/ClusterNotFound";
import { ClusterTabs } from "../components/ClusterTabs";
import { ConfigurationEditor } from "../components/ConfigurationEditor";
import { ErrorWithRetry } from "../components/ErrorWithRetry";
import { GatewayConfigError } from "../components/GatewayConfigError";
import { findGatewayById } from "../config/findGatewayById";
import type { LoadGatewayConfig } from "../config/loadGatewayConfig";
import type { KafkaAdministration } from "../gateway/administration";
import type { GetCluster } from "../gateway/getCluster";
import type { GatewayEntry } from "../gateway/types";
import { useClusterStatus } from "../hooks/useClusterStatus";
import { useGatewayConfig } from "../hooks/useGatewayConfig";

type Props = {
  loadGatewayConfig: LoadGatewayConfig;
  getCluster: GetCluster;
  administration: KafkaAdministration;
  statusRefreshMs: number;
};

function BrokerConfiguration({ gateway, getCluster, administration, statusRefreshMs }: Omit<Props, "loadGatewayConfig"> & { gateway: GatewayEntry }) {
  const [brokerID, setBrokerID] = useState<number | null>(null);
  const cluster = useClusterStatus(gateway, getCluster, statusRefreshMs);
  if (cluster.isPending) return <p role="status">Loading brokers…</p>;
  if (!cluster.data) return <ErrorWithRetry error={cluster.error} gateway={gateway} onRetry={() => void cluster.refetch()} />;
  const brokers = [...cluster.data.brokers].sort((a, b) => a.id - b.id);
  const broker = brokers.find((item) => item.id === brokerID) ?? brokers[0];
  if (!broker) return <p>No brokers reported.</p>;
  return (
    <>
      {cluster.isError ? <ErrorWithRetry error={cluster.error} gateway={gateway} onRetry={() => void cluster.refetch()} /> : null}
      <label>Broker
        <select disabled={cluster.isError} value={broker.id} onChange={(event) => setBrokerID(Number(event.target.value))}>
          {brokers.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.host}:{item.port}</option>)}
        </select>
      </label>
      <ConfigurationEditor key={`${gateway.id}:${broker.id}`} gateway={gateway} resource={{ kind: "broker", id: broker.id }} administration={administration} ready={!cluster.isError} />
    </>
  );
}

export function BrokerConfigurationPage({ loadGatewayConfig, getCluster, administration, statusRefreshMs }: Props) {
  const { gatewayId } = useParams();
  const { data: gateways, isError, refetch } = useGatewayConfig(loadGatewayConfig);
  if (isError) return <GatewayConfigError onRetry={() => void refetch()} />;
  if (!gateways) return <main><p role="status">Loading…</p></main>;
  const gateway = findGatewayById(gateways, gatewayId);
  if (!gateway) return <ClusterNotFound gatewayId={gatewayId} />;
  return (
    <>
      <ClusterTabs gatewayId={gateway.id} view="configuration" />
      <main>
        <h2>Broker configuration</h2>
        <p>Inspect Kafka settings for {gateway.name}. Per-broker changes do not edit Gateway connection settings or cluster-wide defaults.</p>
        <BrokerConfiguration gateway={gateway} getCluster={getCluster} administration={administration} statusRefreshMs={statusRefreshMs} />
      </main>
    </>
  );
}
