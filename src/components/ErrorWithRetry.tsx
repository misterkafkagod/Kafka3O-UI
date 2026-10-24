import { describeGatewayError } from "../gateway/describeGatewayError";

type ErrorWithRetryProps = {
  error: unknown;
  onRetry: () => void;
};

export function ErrorWithRetry({ error, onRetry }: ErrorWithRetryProps) {
  const { title, detail } = describeGatewayError(error);

  return (
    <div role="alert">
      <p>{title}</p>
      {detail ? <p>{detail}</p> : null}
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
