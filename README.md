# AI Policy Reviewer

Local demo that reviews return/warranty claims against `policy/return_policy_kb.json`. Sample claims live in `customer_data/sample_claims.json`. Simple claims are auto-resolved; high-value, repeat, or ambiguous claims go to a human inbox.

## Setup

1. Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`.
2. `npm install`
3. `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) and click **Load sample claims**.

`npm run verify-samples` checks that the 8 sample claims route to auto vs inbox using the deterministic policy gates.
