# ADR-0001: Sprint 1 money and transaction-date policies

- **Status:** Accepted for Issue #8 implementation; teammate review requested before merge.
- **Scope:** Sprint 1 vertical slice only.
- **Decision context:** The reviewed SRS/feature contracts left OQ-01/02/03/07 open. Guntee explicitly delegated the Sprint 1 currency choice to the implementation agent. Guntee reports that the selected precision, date, summary, and amount-boundary policies below were confirmed with the team/course. This ADR is transparent about the delegated currency choice and does not claim separate instructor approval.

## Decisions

1. Sprint 1 supports **THB only**, with **two fractional digits**. This does not decide future currency support. No foreign exchange or mixed-currency operation is included.
2. Money crosses the JSON boundary as base-10 decimal strings and is converted to exact integer minor units for arithmetic and persistence. Binary floating-point is prohibited. Responses render exactly two fractional digits.
3. Reject a money input with more than two fractional digits. Never implicitly round posted Transactions, allocation lines, balance effects, or Sprint 1 summaries. Any future derived operation requiring rounding needs a separate decision.
4. Require an explicit ISO calendar date (`YYYY-MM-DD`) for each Transaction. Persist and return that date unchanged, with no timezone conversion and no implicit current-date default.
5. Income/expense summaries use all-time totals by default; there is no implicit date filter in Sprint 1. Date-filtered reports are outside this slice.
6. Every opening amount, Transaction total, and allocation amount must be positive. Reject a repayment larger than the outstanding Loan Taken debt and reject a Cash outflow larger than the available Cash balance.
7. No product-specific maximum amount or allocation-line count is defined. Do not invent one; any later product limit requires an approved decision. Technical input-safety limits must be documented as such, not presented as a domain rule.

## Consequences

- The Sprint 1 seed and test fixtures use THB values with at most two fractional digits.
- Financial arithmetic can use integer minor units with exact conversion at the API boundary.
- Date-only values avoid timezone-dependent day shifts; any reporting period expansion needs its own feature contract.
- OQ-01 remains open for currencies beyond THB and cross-currency behavior. OQ-04 and OQ-06 remain open; OQ-05 is resolved by ADR-0002. OQ-07 remains open for future amount maxima and allocation-line limits.
- The Issue #8 implementation branch records these decisions; the PR requires the normal specific teammate review before integration.
