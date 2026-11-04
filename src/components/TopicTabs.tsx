import { NavLink } from "react-router";
import type { GatewayEntry } from "../gateway/types";

type TopicTabsProps = {
  gateway: GatewayEntry;
  topicName: string;
};

export function TopicTabs({ gateway, topicName }: TopicTabsProps) {
  const topicPath = `/clusters/${gateway.id}/topics/${encodeURIComponent(topicName)}`;

  return (
    <nav aria-label="Topic views">
      <NavLink to={topicPath} end>
        Details
      </NavLink>
      {" | "}
      <NavLink to={`${topicPath}/messages`}>Messages</NavLink>
    </nav>
  );
}
