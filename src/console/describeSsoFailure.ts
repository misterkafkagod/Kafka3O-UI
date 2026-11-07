import { ConsoleSessionError } from "./ConsoleSessionError";

export function describeSsoFailure(failure: unknown): string {
  const code = failure instanceof ConsoleSessionError ? failure.code : "outcome_unknown";
  switch (code) {
    case "sso_unsupported":
      return "Cognito sign-in requires a current browser. Local sign-in is still available.";
    case "sso_unavailable":
      return "Cognito sign-in is unavailable right now. Local sign-in is still available.";
    case "sign_in_denied":
      return "Cognito sign-in was cancelled or denied.";
    case "already_signed_in":
      return "This browser already has an active session. Sign out before signing in again.";
    case "authentication_throttled":
      return "Too many sign-in attempts. Wait before trying again.";
    case "browser_verification_failed":
      return "This browser could not be verified for Cognito sign-in. Local sign-in is still available.";
    default:
      return "Cognito sign-in could not be completed. Start again.";
  }
}
