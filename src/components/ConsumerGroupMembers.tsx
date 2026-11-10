import type { ConsumerGroup } from "../gateway/types";
import { ScrollableTableRegion } from "./ScrollableTableRegion";

type ConsumerGroupMembersProps = {
  group: ConsumerGroup;
};

export function ConsumerGroupMembers({ group }: ConsumerGroupMembersProps) {
  return group.members.length > 0 ? (
    <ScrollableTableRegion label={`Members of ${group.id} table scroll area`}>
      <table aria-label={`Members of ${group.id}`}>
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col">Client</th>
            <th scope="col">Host</th>
            <th scope="col">Instance</th>
          </tr>
        </thead>
        <tbody>
          {group.members.map((member) => (
            <tr key={member.id}>
              <td>{member.id}</td>
              <td>{member.clientId}</td>
              <td>{member.clientHost}</td>
              <td>{member.instanceId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTableRegion>
  ) : (
    <p>{group.error ? "Member information may be unavailable." : "No active members."}</p>
  );
}
