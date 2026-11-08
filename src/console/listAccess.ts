import type { AccessListing, ConsoleAdminTransport } from "./ConsoleAdmin";
import { parseAccessListing } from "./parseAccessListing";

export async function listAccess(transport: ConsoleAdminTransport, after?: string): Promise<AccessListing> {
  return parseAccessListing(await transport({ kind: "listAccess", after }));
}
