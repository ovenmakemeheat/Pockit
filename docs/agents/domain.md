# Domain Docs

Pockit is a single-context product: its packages and apps support one personal-finance domain.

## Before exploring

- Read the root `GLOSSARY.md` when it exists.
- Read relevant decisions in `docs/adr/`.
- Also read `AGENTS.md` and the applicable approved project/feature requirements.

If the glossary or ADRs don't exist yet, proceed without flagging their absence. Create them lazily when `/domain-modeling` resolves terminology or an architectural decision.

## Use the project's vocabulary

Use approved domain terms consistently, including User, Administrator, Account, Cash, Loan Given, Loan Taken, Income, Expense, Transaction, and allocation line. When a glossary is added, follow it over local synonyms.

## Layout

- `GLOSSARY.md` at the repository root contains shared domain language.
- `docs/adr/` contains system-wide architecture decisions.
- Don't split glossary or ADRs by package unless the product gains a genuinely separate domain context and the layout is deliberately revisited.

## ADR conflicts

Surface conflicts with existing decisions rather than silently overriding them. Record newly resolved architectural decisions as ADRs when appropriate.
