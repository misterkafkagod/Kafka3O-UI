import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import type { GatewayCredentials } from "../gateway/GatewayCredentials";
import { isValidGatewayToken } from "../gateway/isValidGatewayToken";
import type { GatewayEntry } from "../gateway/types";

type GatewayCredentialFormProps = {
  gateway: GatewayEntry;
  credentials: GatewayCredentials;
  credentialRevision: number;
  onCredentialChange: () => void;
};

export function GatewayCredentialForm({ gateway, credentials, credentialRevision, onCredentialChange }: GatewayCredentialFormProps) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken("");
  }, [gateway.url]);

  useEffect(() => {
    try {
      setHasToken(credentials.read(gateway.url) !== null);
      setError("");
    } catch {
      setHasToken(false);
      setError("Cannot read session credentials. Check the gateway URL and browser storage settings.");
    }
  }, [credentials, gateway.url, credentialRevision]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidGatewayToken(token)) {
      setError("A token must contain at least 32 bearer-token characters.");
      return;
    }
    try {
      credentials.save(gateway.url, token);
      setToken("");
      setHasToken(true);
      setError("");
      void queryClient.resetQueries({ queryKey: ["gateway"] });
      onCredentialChange();
    } catch {
      setError("Cannot save the token. Use an HTTPS gateway and a secure UI context with session storage enabled.");
    }
  }

  function onClear() {
    try {
      credentials.clear(gateway.url);
      setToken("");
      setHasToken(false);
      setError("");
      void queryClient.resetQueries({ queryKey: ["gateway"] });
      onCredentialChange();
    } catch {
      setError("Cannot remove the token from session storage.");
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label={`Credentials for ${gateway.name}`}>
      <label>
        Token for {gateway.name}
        <input type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} />
      </label>{" "}
      <button type="submit">Use token</button>{" "}
      {hasToken ? (
        <>
          <span>Token stored for this session.</span>{" "}
          <button type="button" onClick={onClear}>Remove token</button>
        </>
      ) : <span>No token stored.</span>}
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
