import { classifyGatewayError } from "../gateway/classifyGatewayError";
import { describeGatewayError } from "../gateway/describeGatewayError";
import type { GatewayEntry } from "../gateway/types";
import { GatewayCredentialAction } from "./GatewayCredentialAction";

type ErrorWithRetryProps = {
  error: unknown;
  gateway: GatewayEntry;
  onRetry: () => void;
};

export function ErrorWithRetry({ error, gateway, onRetry }: ErrorWithRetryProps) {
  const { title, detail } = describeGatewayError(error, gateway.url);

  return (
    <div role="alert">
      <p>{title}</p>
      {detail ? <p>{detail}</p> : null}
      {classifyGatewayError(error) === "authentication-required" ? <GatewayCredentialAction gateway={gateway} /> : null}
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
