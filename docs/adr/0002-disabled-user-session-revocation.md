# ADR-0002: Immediate revocation for disabled Users

- **Status:** Accepted by product owner for Issue #8 implementation; teammate review required before merge.
- **Decision owner:** Guntee Doungmanee (product owner).
- **Context:** SRS OQ-05 asks how disabling a User affects active sessions. The Administrator must manage platform User access, while a disabled User must lose protected access. Session revocation must be enforced by the server, not only by the UI.

## Decision

When an Administrator disables a User:

1. Persist the disabled status and delete all of that User's stored sessions in the same database transaction.
2. Reject future Better Auth session creation for the disabled User, so valid credentials cannot establish a new authenticated session.
3. Require protected API procedures to reject disabled identities. This status check is defense in depth for any session created concurrently with disablement or supplied from a stale client cookie.
4. Do not enable Better Auth cookie session caching. A browser may retain a stale cookie, but the deleted server-side session makes it unusable on the next request; clients should clear local session state after an unauthorized response.
5. Administrator user-management operations return only identity/access fields, never financial records, balances, summaries, or other finance-derived information. Only target records whose role is `User` may be enabled or disabled; Administrator accounts are not modified through this interface.

## Consequences

- Disablement takes effect for subsequent requests as soon as the transaction commits. Requests already authorized before that commit are not retroactively cancelled.
- Re-enabling a User does not restore revoked sessions; the User must sign in again.
- The web UI can clear its local session state when it receives an unauthorized response, but the security boundary is the server-side stored session/status check.
- Tests must cover disabled login, disabling an active session, stale-cookie requests, role restrictions, and absence of financial data from Administrator responses.
- This decision resolves SRS OQ-05 for Sprint 1. It does not establish a general audit-log or session-history requirement.
