// Fake gateway for tests. Each test registers the responses it needs with
// server.use(...); unhandled requests fail the test.
import { setupServer } from 'msw/node';

export const server = setupServer();
