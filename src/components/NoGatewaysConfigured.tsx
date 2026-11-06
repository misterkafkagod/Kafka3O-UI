const example = '{"gateways":[{"id":"dev","name":"Dev","url":"https://localhost:8081"}]}';

export function NoGatewaysConfigured() {
  return (
    <main>
      <h2>No gateways configured</h2>
      <p>
        Add your gateways to <code>/config.json</code>, for example:
      </p>
      <pre>{example}</pre>
    </main>
  );
}
