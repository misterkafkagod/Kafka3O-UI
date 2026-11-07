# Discovery: Cognito User Pool fixture
- **Goal:** Specify a Cognito-compatible authorization-code flow that can be
  exercised without an AWS account, without presenting the fixture as a live
  Cognito integration.
- **Done when:** Public provider documentation supplies a fixture recipe and
  the remaining real-pool checks are explicit.
- **Phase:** P53
- **Status:** Done for the controlled fixture; live-pool discovery is pending.
- **Secrets used:** None. A real app-client secret and a separate storage
  encryption key must be deployment-provisioned, never documented by value.

## Log
### 1. Authorization and token endpoints — 2026-11-06
- **Tried:** Read AWS documentation for managed login and OAuth endpoints.
- **Sources:** [Authorize](https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html),
  [token](https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html),
  and [federation endpoints](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html).
- **Result:** Authorization is an HTTPS browser GET; the code and `state`
  return to an exactly registered callback. Request `openid`,
  `response_type=code`, random state/nonce and PKCE `S256`. The HTTPS token
  endpoint accepts a form-encoded code, the original redirect URI and
  `code_verifier`; a public client sends `client_id`, while a confidential
  client may use explicit `client_secret_basic`.
- **Learned:** The managed-login domain can differ from the User Pool issuer.
  AWS documents both original and updated issuer formats; configure and
  validate the exact issuer rather than deriving it from the login domain.
  No live request or app-client configuration was tested.

### 2. Discovery, signature and claims — 2026-11-06
- **Tried:** Read AWS token-verification and claim-parsing guidance.
- **Sources:** [Verify JWTs](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html),
  [parse tokens safely](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-parse-tokens-safely.html),
  and [token overview](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html).
- **Result:** Discovery and JWKS are hosted at the issuer; signing keys can
  rotate. ID tokens require signature, expiry, issuer, app-client audience
  and `token_use=id` validation; the application must compare the original
  nonce. Verified `cognito:groups` is an array, and unknown claims must be
  tolerated. A `sub` is opaque and must not be assumed to be a UUID.
- **Learned:** Offline signature and expiry checks do not prove a token was
  not revoked. Use a maintained JWT/OIDC verifier, not a custom JWT parser;
  never use an unverified claim or email to confer access.

### 3. Refresh and sign-out — 2026-11-06
- **Tried:** Read AWS refresh, revocation and logout documentation.
- **Sources:** [Refresh tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html),
  [token endpoint](https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html),
  [revoke endpoint](https://docs.aws.amazon.com/cognito/latest/developerguide/revocation-endpoint.html),
  and [logout endpoint](https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html).
- **Result:** Managed-login authorization-code sessions can refresh ID and
  access tokens at the token endpoint. When rotation is enabled the response
  includes a new refresh token. The revoke endpoint accepts a refresh token;
  the browser-facing `/logout` uses `client_id` and an allowed `logout_uri`.
  Cognito logout does not sign out an upstream OIDC or social provider.
- **Learned:** An uncertain exchange or rotating refresh cannot safely be
  retried automatically. Persist retained refresh tokens encrypted with a
  key outside SQLite; invalidate the application session independently of
  provider logout. Live propagation, rotation, logout and error behavior
  still require a real User Pool.
- **Refresh ID-token correction:** [OpenID Connect Core 12.2](https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokenResponse)
  permits a refresh response without an ID token. If it contains one, its
  issuer, subject and audience must match the original ID token; it should
  omit `nonce`, but if present the nonce must match the original. P53 requires
  fresh verified groups, so a response without an ID token must fail closed.
  Refresh verification needs a separate path from authorization-code nonce
  validation; never disable the nonce check on the initial login. Actual
  Cognito refresh-token claim behavior remains unverified.

### 4. Live User Pool provisioned — 2026-11-07
- **Tried:** Created a User Pool with the AWS CLI in `sa-east-1` on the
  Essentials plan: email sign-in, admin-created users only, MFA off, no SMS,
  deletion protection on; a confidential app client (authorization-code
  grant, `openid` scope only, token revocation on) with placeholder
  `https://localhost:8443` callback and sign-out URLs; a Cognito prefix
  domain with managed login v2; and groups `kafka3o-admins` and
  `kafka3o-viewers`. Identifiers are kept out of this repository.
- **Result:** Discovery at the issuer returned the exact
  `cognito-idp.<region>.amazonaws.com/<pool-id>` issuer and JWKS, while the
  authorization, token and `/logout` endpoints are on the prefix login
  domain. An unauthenticated authorize request returned HTTP 302 to managed
  login.
- **Learned:** The endpoint allowlist must accept the login domain
  separately from the issuer host. No sign-in, token exchange, refresh,
  rotation or logout was exercised; the callback URLs must be updated when
  T53.4 fixes the route.

## Fixture recipe
1. Configure a synthetic issuer and separate managed-login endpoint over
   verified HTTPS, an exact callback and logout URL, and a synthetic app
   client. Generate ephemeral signing keys, credentials and certificates.
2. Discover only from the configured issuer; verify its returned issuer,
   HTTPS endpoints and expected endpoint allowlist before using them.
   Keep certificate and hostname verification enabled, including in tests.
3. Start one short-lived, browser-bound, single-use authorization attempt
   with independently random state, nonce and PKCE verifier. Exchange a
   callback code exactly once with the matching verifier and callback URI.
4. Verify the signed ID token, configured issuer/client, expiry, nonce and
   `token_use=id`; identify a user only by `(issuer, sub)`. Unknown groups
   grant nothing. Unknown identities start without direct role grants.
5. Issue an opaque application session. On protected use, refresh verified
   group claims no later than five minutes or token expiry, whichever is
   earlier; failed or uncertain refresh denies SSO access without disabling
   local login. Serialize refresh and handle rotation without replay.
6. Invalidate the application session locally before offering the configured
   provider logout, and report provider failure without claiming upstream
   sign-out.

## Open questions
- No AWS account, User Pool, app client, custom domain or real credentials
  were available. All provider-specific interoperability, group-change and
  revocation timing, refresh-token rotation and native-browser callback and
  cookie behavior are **not run**.
- The fixture cannot establish Cognito's current account settings, client
  secret policy, enabled scopes, callback/logout allowlists or MFA behavior.
  Verify those against the eventual pool before relying on SSO.
- The policy-management UI, Gateway authorization and secured deployment
  are later M10 phases; the fixture alone cannot claim those are complete.

## Spec impact
- Use `github.com/coreos/go-oidc/v3` v3.21.0 for OIDC/JWKS verification and
  `golang.org/x/oauth2` v0.37.0 for the OAuth2 code exchange, subject to a
  vulnerability scan when added. Do not write a JWT verifier.
- Use server-owned configuration and a deployment-managed encryption key;
  do not log callback query strings, authorization codes, tokens, secrets,
  group contents or raw identity attributes.
- Keep SSO opt-in and independent of local sign-in availability. The
  fixture does not establish real AWS compatibility.
