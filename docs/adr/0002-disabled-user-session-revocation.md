# ADR-0002: Immediate revocation for disabled Users

- **Status:** Accepted by product owner for Issue #8 implementation; teammate review required before merge.
- **Decision owner:** Guntee Doungmanee (product owner).
- **Context:** SRS OQ-05 asks how disabling a User affects active sessions. The Administrator must manage platform User access, while a disabled User must lose protected access. Session revocation must be enforced by the server, not only by the UI.

## Decision

When an Administrator disables a User:

1. Persist the disabled status and delete all of that User's stored sessions in the same database transaction.
2. Reject Better Auth session creation for a User who is already disabled, so valid credentials cannot establish an authenticated session. Also guard the check/creation race: the session `create.after` hook opens a database transaction, locks the owning User row (`FOR UPDATE`), re-reads the committed enabled status, and deletes the newly created session if that User is disabled. This serializes the post-create check with the Administrator's status update and session-revocation transaction.
3. Require protected API procedures to reject disabled identities. This status check is defense in depth for any session created concurrently with disablement or supplied from a stale client cookie.
4. Do not enable Better Auth cookie session caching. A browser may retain a stale cookie, but the deleted server-side session makes it unusable on the next request; clients should clear local session state after an unauthorized response.
5. Administrator user-management operations return only identity/access fields, never financial records, balances, summaries, or other finance-derived information. Only target records whose role is `User` may be enabled or disabled; Administrator accounts are not modified through this interface.

## Consequences

- Disablement takes effect for subsequent requests as soon as the transaction commits. Requests already authorized before that commit are not retroactively cancelled.
- Re-enabling a User does not restore revoked sessions; the User must sign in again. A sign-in racing with disablement may return a cookie whose session is immediately removed, but that cookie remains unauthenticated after re-enable.
- The concurrent check/disable path is covered by a deterministic PostgreSQL-backed regression test that pauses sign-in after its enabled-status read, commits disablement, resumes sign-in, and verifies no session survives or becomes valid after re-enable.
- The web UI can clear its local session state when it receives an unauthorized response, but the security boundary is the server-side stored session/status check.
- Tests must cover disabled login, disabling an active session, stale-cookie requests, role restrictions, and absence of financial data from Administrator responses.
- This decision resolves SRS OQ-05 for Sprint 1. It does not establish a general audit-log or session-history requirement.
