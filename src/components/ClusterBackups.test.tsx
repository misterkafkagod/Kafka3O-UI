import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ListTopics } from "../gateway/listTopics";
import { renderWithQuery } from "../test/renderWithQuery";
import { ClusterBackups } from "./ClusterBackups";

const gateway = { id: "kafka-a", name: "Kafka A", url: "https://gw" };

describe("ClusterBackups", () => {
  it("offers Start backup when backups are available", async () => {
    renderWithQuery(<ClusterBackups gateway={gateway} listTopics={vi.fn<ListTopics>().mockResolvedValue([])}
      actions={{ start: vi.fn(), confirm: vi.fn() }} />);
    expect(screen.getByRole("heading", { name: "Backups", level: 2 })).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Start backup" })).toBeDefined();
  });

  it("says when backups are not available", () => {
    renderWithQuery(<ClusterBackups gateway={gateway} listTopics={vi.fn<ListTopics>()} />);
    expect(screen.getByRole("status").textContent).toBe("Backups are not available in this console.");
  });
});
