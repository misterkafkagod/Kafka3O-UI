import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { KafkaAdministration, KafkaConfiguration } from "../gateway/administration";
import { HttpError } from "../gateway/HttpError";
import { renderWithQuery } from "../test/renderWithQuery";
import { ConfigurationEditor } from "./ConfigurationEditor";

const gateway = { id: "dev", name: "Dev", url: "https://gateway.example" };
const resource = { kind: "broker" as const, id: 1 };
const entries: KafkaConfiguration[] = [
  { name: "auto.create.topics.enable", value: "true", sensitive: false, readOnly: true, source: "STATIC_BROKER_CONFIG", type: "BOOLEAN" },
  { name: "log.retention.ms", value: "60000", sensitive: false, readOnly: false, source: "DYNAMIC_BROKER_CONFIG", type: "LONG", documentation: "Retention time" },
  { name: "ssl.password", value: "must-not-be-rendered", sensitive: true, readOnly: false, source: "DEFAULT_CONFIG", type: "PASSWORD" },
];

function administration(overrides: Partial<KafkaAdministration> = {}): KafkaAdministration {
  return {
    getConfigurations: async () => entries,
    alterConfiguration: async () => {},
    increasePartitions: async () => {},
    listReassignments: async () => [],
    reassignPartition: async () => {},
    confirmChange: () => true,
    ...overrides,
  };
}

describe("ConfigurationEditor", () => {
  it("filters settings and never exposes sensitive values or edits read-only entries", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ConfigurationEditor gateway={gateway} resource={resource} administration={administration()} />);
    expect(await screen.findByText("auto.create.topics.enable")).toBeDefined();
    expect(screen.getByText("Read-only")).toBeDefined();
    expect(screen.getByText("Sensitive value hidden")).toBeDefined();
    expect(screen.queryByText("must-not-be-rendered")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit auto.create.topics.enable" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit ssl.password" })).toBeNull();
    await user.type(screen.getByRole("searchbox", { name: "Filter settings by name" }), "RETENTION");
    expect(screen.getByText("log.retention.ms")).toBeDefined();
    expect(screen.queryByText("auto.create.topics.enable")).toBeNull();
    await user.click(screen.getByText("About log.retention.ms"));
    expect(screen.getByText("Retention time")).toBeDefined();
    const edit = screen.getByRole("button", { name: "Edit log.retention.ms" });
    await user.click(edit);
    expect(document.activeElement).toBe(screen.getByRole("form", { name: "Edit log.retention.ms" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(edit);
  });

  it("requires confirmation, blocks duplicates, and refreshes after acceptance", async () => {
    const user = userEvent.setup();
    let finish = () => {};
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const alter = vi.fn(() => pending);
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const read = vi.fn(async () => entries);
    renderWithQuery(<ConfigurationEditor gateway={gateway} resource={resource} administration={administration({ alterConfiguration: alter, confirmChange: confirm, getConfigurations: read })} />);
    await user.click(await screen.findByRole("button", { name: "Edit log.retention.ms" }));
    await user.clear(screen.getByLabelText("New value"));
    await user.type(screen.getByLabelText("New value"), "120000");
    await user.click(screen.getByRole("button", { name: "Review and confirm" }));
    expect(alter).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Review and confirm" }));
    expect(alter).toHaveBeenCalledTimes(1);
    expect(alter).toHaveBeenCalledWith(gateway.url, resource, { name: "log.retention.ms", operation: "set", value: "120000" });
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("broker 1"));
    expect(screen.getByRole("button", { name: "Submitting…" }).matches(":disabled")).toBe(true);
    finish();
    expect(await screen.findByText(/Kafka accepted the change/)).toBeDefined();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  });

  it("resets only an override on the selected resource", async () => {
    const user = userEvent.setup();
    const alter = vi.fn(async () => {});
    renderWithQuery(<ConfigurationEditor gateway={gateway} resource={resource} administration={administration({ alterConfiguration: alter })} />);
    await user.click(await screen.findByRole("button", { name: "Edit log.retention.ms" }));
    await user.selectOptions(screen.getByLabelText("Operation"), "reset");
    expect(screen.getByText(/removes only this broker's override/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Review and confirm" }));
    await waitFor(() => expect(alter).toHaveBeenCalledWith(gateway.url, resource, { name: "log.retention.ms", operation: "reset", value: null }));
  });

  it("blocks further writes after an uncertain result until a successful refresh", async () => {
    const user = userEvent.setup();
    const alter = vi.fn(async () => { throw new HttpError(503, "unknown", { code: "configuration_write_unknown" }); });
    const read = vi.fn().mockResolvedValueOnce(entries).mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue(entries);
    renderWithQuery(<ConfigurationEditor gateway={gateway} resource={resource} administration={administration({ alterConfiguration: alter, getConfigurations: read })} />);
    await user.click(await screen.findByRole("button", { name: "Edit log.retention.ms" }));
    await user.click(screen.getByRole("button", { name: "Review and confirm" }));
    expect(await screen.findByText(/may have been accepted/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Review and confirm" }).matches(":disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Refresh configuration" }));
    const readError = await screen.findByText("Gateway unreachable");
    expect(within(readError.closest('[role="alert"]')!).getByRole("button", { name: "Retry" })).toBeDefined();
    expect(alter).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Refresh configuration" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Edit log.retention.ms" }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByText(/Configuration refreshed. Check the effective value/)).toBeDefined();
    expect(screen.queryByText(/may have been accepted/)).toBeNull();
    expect(alter).toHaveBeenCalledTimes(1);
  });
});
