import { compareBrokersById } from "../brokers/compareBrokersById";
import type { Broker } from "../gateway/types";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

export function BrokerTable({ brokers }: { brokers: Broker[] }) {
  const sorted = [...brokers].sort(compareBrokersById);

  return (
    <ScrollableTableRegion label="Brokers table scroll area">
      <table aria-label="Brokers">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Host:Port</th>
            <th scope="col">Rack</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((broker) => (
            <tr key={broker.id}>
              <td>{broker.id}</td>
              <td>
                {broker.host}:{broker.port}
              </td>
              <td>{broker.rack ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableRegion>
  );
}
