# Claude Instructions

Shared rules live here:

- Claude profile: `/home/ssf/.claude/CLAUDE.md`
- Shared ecosystem instructions: `/home/ssf/Documents/Github/CLAUDE.md`
- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# CLAUDE.md (flipflop-service)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

## flipflop-service

**Purpose**: Automated Czech e-commerce platform (flipflop.alfares.cz) — AI-driven product management, pricing, and marketing.  
**Domain**: https://flipflop.alfares.cz  
**Stack**: NestJS (backend) · Next.js SSR + Tailwind (frontend) · PostgreSQL · Redis

### Key constraints
- Never publish pricing changes without validation
- Never cancel customer orders without human approval
- Czech consumer law compliance: 14-day return right must be honored
- LLM budget cap: 500k units/month across all AI tasks
- Escalation: @sergej_partizan on Telegram

### Success metrics
- Revenue growth MoM · Conversion rate > 2% · Order fulfillment < 48h

### Integration chain
catalog-microservice (products) → flipflop-service → customer  
orders-microservice (order state) ← flipflop-service  
warehouse-microservice (stock) ← flipflop-service  
ai-microservice (product descriptions, SEO) ← flipflop-service

**Ops**: `kubectl logs -n statex-apps deploy/flipflop-api-gateway --tail=100` · `./scripts/deploy.sh`
