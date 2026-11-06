export function GatewayConfigError({ onRetry }: { onRetry: () => void }) {
  return (
    <main>
      <div role="alert">
        <p>Gateway configuration unavailable</p>
        <p>The UI could not retrieve /config.json. Check the UI host and retry.</p>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    </main>
  );
}
