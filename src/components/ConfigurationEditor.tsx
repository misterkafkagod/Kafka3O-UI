import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ConfigurationResource, KafkaAdministration, KafkaConfiguration } from "../gateway/administration";
import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { describeAdministrationError } from "../gateway/describeAdministrationError";
import type { GatewayEntry, GatewayErrorKind } from "../gateway/types";
import { hasLocalOverride } from "../topics/hasLocalOverride";
import { ErrorWithRetry } from "./ErrorWithRetry";
import { GatewayErrorRecovery } from "./GatewayErrorRecovery";
import { ScrollableTableRegion } from "./ScrollableTableRegion";
import styles from "./KafkaAdministration.module.css";
import { SettingInfo } from "./SettingInfo";

type Props = {
  gateway: GatewayEntry;
  resource: ConfigurationResource;
  administration: KafkaAdministration;
  ready?: boolean;
};

export function ConfigurationEditor({ gateway, resource, administration, ready = true }: Props) {
  const queryClient = useQueryClient();
  const resourceName = resource.kind === "topic" ? resource.name : String(resource.id);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["gateway", gateway.id, "configuration", resource.kind, resourceName],
    queryFn: () => administration.getConfigurations(gateway.url, resource),
    retry: false,
  });
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<KafkaConfiguration | null>(null);
  const [value, setValue] = useState("");
  const [operation, setOperation] = useState<"set" | "reset">("set");
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [writeError, setWriteError] = useState("");
  const [errorKind, setErrorKind] = useState<GatewayErrorKind>();
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const editTrigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (selected) formRef.current?.focus();
    else if (!pending && restoreFocus.current) {
      restoreFocus.current = false;
      editTrigger.current?.focus();
    }
  }, [selected, pending]);

  async function refresh() {
    const result = await refetch();
    if (!result.isError) {
      setUncertain(false);
      setSelected(null);
      if (uncertain) {
        setWriteError("");
        setErrorKind(undefined);
        setMessage("Configuration refreshed. Check the effective value before making another change.");
      }
    }
  }

  function edit(entry: KafkaConfiguration, trigger: HTMLButtonElement) {
    editTrigger.current = trigger;
    setSelected(entry);
    setValue(entry.value ?? "");
    setOperation("set");
    setMessage("");
    setWriteError("");
    setErrorKind(undefined);
  }

  function closeEditor() {
    restoreFocus.current = true;
    setSelected(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uncertain || !ready || selected === null || selected.readOnly || selected.sensitive) return;
    if (operation === "reset" && !hasLocalOverride(selected, resource)) {
      setWriteError("There is no override for this resource to reset.");
      return;
    }
    const target = resource.kind === "topic" ? `topic "${resource.name}"` : `broker ${resource.id}`;
    const action = operation === "reset" ? `Reset the override for "${selected.name}"` : `Set "${selected.name}" to "${value}"`;
    try {
      if (!administration.confirmChange(`${action} on ${target} in ${gateway.name}?`)) return;
    } catch {
      setWriteError("The confirmation dialog is unavailable; no change was submitted.");
      return;
    }
    submitting.current = true;
    setPending(true);
    setMessage("");
    setWriteError("");
    setErrorKind(undefined);
    try {
      await administration.alterConfiguration(gateway.url, resource, {
        name: selected.name, operation, value: operation === "set" ? value : null,
      });
      setMessage(`Kafka accepted the change to "${selected.name}". Verify the effective value below; propagation may take time.`);
      closeEditor();
      await refetch();
      if (resource.kind === "topic") {
        void queryClient.invalidateQueries({ queryKey: ["gateway", gateway.id, "topic", resource.name], exact: true });
      }
    } catch (failure) {
      const described = describeAdministrationError(failure);
      setWriteError(described.message);
      setUncertain(described.uncertain);
      setErrorKind(classifyGatewayError(failure));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const entries = (data ?? []).filter((entry) => entry.name.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <section aria-labelledby="configuration-editor-heading" className={styles.section}>
      <div className={styles.sectionHeading}>
        <h3 id="configuration-editor-heading">Kafka configuration</h3>
        <button type="button" disabled={pending} onClick={() => void refresh()}>Refresh configuration</button>
      </div>
      <p>Changes apply to this {resource.kind} only. Sensitive settings are hidden; settings Kafka marks read-only cannot be changed here.</p>
      {message ? <p role="status">{message}</p> : null}
      {writeError ? (
        <div role="alert">
          <p>{writeError}</p>
          <GatewayErrorRecovery gateway={gateway} kind={errorKind} />
        </div>
      ) : null}
      {uncertain ? <p>Refresh configuration successfully before submitting another change.</p> : null}
      {selected && !isError ? (
        <form ref={formRef} tabIndex={-1} aria-label={`Edit ${selected.name}`} onSubmit={(event) => void submit(event)} className={styles.form}>
          <fieldset disabled={pending || uncertain || !ready}>
            <legend>Change {selected.name}</legend>
            <p>Type: {selected.type.toLowerCase()}. Kafka validates the value before it is applied.</p>
            <label>Operation
              <select value={operation} onChange={(event) => setOperation(event.target.value === "reset" ? "reset" : "set")}>
                <option value="set">Set value</option>
                {hasLocalOverride(selected, resource) ? <option value="reset">Reset this override</option> : null}
              </select>
            </label>
            {operation === "set" ? <label>New value<textarea value={value} maxLength={32768} onChange={(event) => setValue(event.target.value)} /></label> :
              <p>Reset removes only this {resource.kind}'s override; Kafka then uses the applicable inherited value.</p>}
            <div className={styles.actions}>
              <button type="submit">{pending ? "Submitting…" : "Review and confirm"}</button>
              <button type="button" onClick={closeEditor}>Cancel</button>
            </div>
          </fieldset>
        </form>
      ) : null}
      {isError ? <ErrorWithRetry error={error} gateway={gateway} onRetry={() => void refresh()} /> : isPending ? <p role="status">Loading configuration…</p> : (
        <>
          <label className={styles.filter}>Filter settings by name
            <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} />
          </label>
          {entries.length === 0 ? <p>No matching settings.</p> : null}
          <ScrollableTableRegion label="Kafka configuration table scroll area">
            <table aria-label="Kafka configuration">
              <thead><tr><th scope="col">Setting</th><th scope="col">Effective value</th><th scope="col">Type</th><th scope="col">Source</th><th scope="col">Access</th></tr></thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.name}>
                    <td>
                      <strong>{entry.name}</strong>
                      {entry.documentation && !entry.sensitive ? <SettingInfo name={entry.name} documentation={entry.documentation} /> : null}
                    </td>
                    <td><code>{entry.sensitive ? "Sensitive value hidden" : entry.value ?? "Not set"}</code></td>
                    <td>{entry.type.toLowerCase()}</td>
                    <td>{entry.source.replaceAll("_", " ").toLowerCase()}</td>
                    <td>
                      {entry.sensitive ? "Sensitive" : entry.readOnly ? "Read-only" : (
                        <button type="button" disabled={pending || uncertain || !ready} aria-label={`Edit ${entry.name}`} onClick={(event) => edit(entry, event.currentTarget)}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableRegion>
        </>
      )}
    </section>
  );
}
