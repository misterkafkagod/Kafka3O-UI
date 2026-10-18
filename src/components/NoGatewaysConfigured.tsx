const example = '{"gateways":[{"id":"dev","name":"Dev","url":"http://localhost:8081"}]}';

export function NoGatewaysConfigured() {
  return (
    <section>
      <h2>No gateways configured</h2>
      <p>
        Add your gateways to <code>/config.json</code>, for example:
      </p>
      <pre>{example}</pre>
    </section>
  );
}
