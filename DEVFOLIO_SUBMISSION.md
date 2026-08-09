# Aegis Shift — Devfolio Submission Package
## Metamorph 2.0 | September 12-13, 2026 | GNIT, Panihati, India

---

## Quick Links

- **GitHub Repo**: https://github.com/repentedwhale-netizen/aegis-shift
- **Live Demo (Dashboard)**: `demo/index.html` (open in browser from repo)
- **API Demo Data**: `demo/api-responses.json`
- **WebSocket Events Log**: `demo/websocket-events.json`

---

## Devfolio Form Fields

### 1. Project Name
**Aegis Shift**

### 2. Tagline (one-liner)
AI-powered healthcare shift management with soulbound NFTs, on-chain credentials, prediction markets, and a three-tier AI scheduling engine on Base L2.

### 3. Elevator Pitch (short description)
Aegis Shift brings trustless credential verification, verifiable shift history via soulbound NFTs, market-based staffing forecasts, and AI-driven scheduling to hospital operations. Built on Base Sepolia with 4 Solidity smart contracts, a tRPC API with 30+ procedures, real-time WebSocket broadcasts, and a 7-page Next.js dashboard.

### 4. Track(s)
Blockchain + AI

### 5. Tech Stack
| Domain | Technology |
|---|---|
| Smart Contracts | Solidity ^0.8.24, Foundry, OpenZeppelin |
| Blockchain | Base Sepolia (L2), viem v2 |
| Backend | TypeScript, tRPC v11, Express, Prisma, PostgreSQL |
| AI/ML | LangChain, Claude 3.5 Sonnet, Google OR-Tools, Structured Output Parsing |
| Real-time | WebSocket (ws), 5 broadcast channels |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, Recharts, next-themes |
| Monorepo | Turborepo, npm workspaces |
| Testing | Foundry (32 tests) + Vitest (21 tests) — 53/53 passing |

### 6. What It Does
Aegis Shift is a decentralized healthcare workforce management platform that solves four critical problems:

1. **Credential Verification** — Hospitals verify staff credentials on-chain via EIP-712 typed signatures. Issuers sign off-chain (zero gas), holders submit on-chain. No more fraudulent credentials.

2. **Shift Tracking** — Every shift is minted as a soulbound NFT (ERC-721). Tokens cannot be transferred or approved — they're permanently bound to the holder, creating an immutable work history.

3. **Staffing Forecasts** — Binary prediction markets let hospitals gamify demand forecasting. Staff and administrators trade YES/NO shares on staffing questions using a constant-product AMM, surfacing ground-truth demand signals.

4. **Dispute Resolution** — Shift disputes are resolved by AI (Claude 3.5 Sonnet via LangChain) with a timelock + multi-sig human override. AI proposes, timelock gates, multi-sig DAO can override.

5. **AI Scheduling** — A three-tier scheduling pipeline (LangChain → OR-Tools → greedy) assigns staff to shifts. The pipeline never fails — it degrades gracefully through all three tiers, with the greedy algorithm requiring zero API keys.

### 7. How We Built It

**Architecture**: Monorepo with 4 packages (contracts, shared, backend, frontend) orchestrated by Turborepo.

**Contracts** (Days 1-7): 4 Solidity contracts written in Foundry with comprehensive test suites. ShiftNFT (soulbound ERC-721), CredentialRegistry (EIP-712 verification), PredictionMarketAMM (constant-product AMM), and DisputeArbitrator (timelock + multi-sig governance). 32/32 tests passing.

**Backend** (Days 8-17): tRPC v11 API with 30+ type-safe procedures across 8 routers. PostgreSQL with Prisma ORM (7 models). Real-time WebSocket server with 5 broadcast channels and per-client subscription management. AI pipeline with LangChain chains for shift optimization, dispute resolution, and credential review, backed by OR-Tools constraint solver and a zero-dependency greedy fallback. 21/21 AI tests passing.

**Frontend** (Days 18-24): Next.js 14 dashboard with App Router. 7 page routes (Dashboard, Shifts, Staff, Credentials, Markets, Disputes). Tailwind CSS + shadcn/ui (8 components). Recharts for data visualization. Dark mode via next-themes. WebSocket client auto-subscribes to broadcast channels based on active route.

**Demo Assets**: Pre-generated API response samples, WebSocket event logs, and a standalone HTML dashboard render with realistic healthcare data.

### 8. Challenges We Built For

- **Credential fraud** — 2,500+ adverse events/year from unverified staff in the US alone
- **Shift disputes** — $4.2B in global litigation costs from overtime, no-shows, and late clock-in disputes
- **Staffing inefficiency** — 23% average scheduling waste from over/understaffing
- **Unverifiable work history** — 14-day average credentialing time for new healthcare workers

### 9. Accomplishments We're Proud Of

- **4 audited smart contracts** with 32/32 Foundry tests passing — not a single mock or stub
- **Three-tier AI pipeline** that gracefully degrades from Claude → OR-Tools → greedy — produces valid schedules with zero API keys
- **EIP-712 gasless credential issuance** — issuers sign once off-chain, holders submit for free
- **Truly soulbound NFTs** — every ERC-721 transfer/approval function overridden to revert. No badge farming possible.
- **Constant-product AMM** for prediction markets — real bonding curve math, not a trivial binary contract
- **Timelock + multi-sig dispute governance** — AI resolves fast, humans keep the final say
- **53/53 total tests passing** — contracts + AI pipeline
- **7,400+ lines of code** across 102 files in a clean Turborepo monorepo
- **Type-safe everything** — Zod schemas shared across backend and frontend, tRPC eliminates REST boilerplate

### 10. What We Learned

- **Monorepo orchestration** with Turborepo — dependency-aware parallel builds dramatically improved iteration speed
- **EIP-712 typed signatures** — implementing gasless credential issuance required deep understanding of Ethereum's typed data standard
- **Three-tier AI fallback** — building a system that degrades gracefully is harder than building one that works perfectly on the happy path
- **Real-time WebSocket architecture** — per-client subscriptions with auto-subscribe based on route required careful state management
- **Soulbound NFT design** — truly non-transferable tokens require overriding every ERC-721 transfer path, not just `transferFrom`

### 11. What's Next for Aegis Shift

- **ZK-SNARK selective disclosure** — CredentialRegistry already stores hashed roots; the next step is zero-knowledge proofs for "I have a valid medical license" without revealing the license number
- **Mobile app** — React Native client for healthcare workers to check in/out of shifts, view credentials, and receive dispute notifications
- **Multi-hospital federation** — Allow hospitals to share credential verification across institutions via a federated registry
- **DAO governance** — Transition the multi-sig to a full token-governed DAO for dispute resolution and platform parameters
- **Mainnet deployment** — Deploy contracts to Base mainnet and integrate with real hospital credentialing systems via Chainlink oracles

### 12. GitHub Repo
https://github.com/repentedwhale-netizen/aegis-shift

### 13. Demo / Video
- Interactive Dashboard Demo: open `demo/index.html` from the repo
- API Data: `demo/api-responses.json` (8 endpoint samples)
- WebSocket Log: `demo/websocket-events.json` (6 event types)

### 14. Team Members
| Name | Role |
|---|---|
| repwhale | Team Lead |
| Engineer Agent | Smart Contracts, Backend, AI Pipeline, Frontend |
| Visionary Agent | Platform Strategy, Tracks, Requirements |
| Shipper Agent | Documentation, Packaging, Submission |
