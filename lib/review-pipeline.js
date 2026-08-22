import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { applyHardGates, applyWindowGate, finalizeRoute } from "./gates.js";
import { retrievePolicies } from "./rag.js";
import {
  getClaim,
  insertClaim,
  insertReview,
  newId,
  updateClaimStatus,
} from "./db.js";
import { getPoliciesByIds } from "./policies.js";

const reviewSchema = z.object({
  route: z.enum(["auto", "escalate"]),
  action: z.enum([
    "approve_refund",
    "approve_exchange",
    "approve_replacement",
    "deny",
    "needs_human",
  ]),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  cited_policy_ids: z.array(z.string()),
  missing_evidence: z.array(z.string()),
  customer_message: z.string(),
});

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not set. Add it to .env.local.");
    error.status = 500;
    throw error;
  }
}

export async function reviewWithAgent(claim, retrievedPolicies) {
  requireApiKey();

  const policyBlock = retrievedPolicies
    .map(
      (policy) =>
        `[${policy.id}] ${policy.title} (${policy.confidence_tag}, score=${policy.score?.toFixed?.(3) ?? "n/a"})\n${policy.policy_text}`,
    )
    .join("\n\n");

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: reviewSchema,
    schemaName: "PolicyReview",
    schemaDescription: "Structured claim decision against retrieved return policies.",
    system: `You are a returns-policy reviewer for an outdoor retailer.
Use ONLY the retrieved policies. Cite policy ids that actually apply.
Hard company rules:
- Claims with item value >= $150 must escalate (pol-004).
- Customers with more than 3 claims in 90 days must escalate (pol-008).
- Unworn unused returns: 30 days (pol-001). Size/fit exchanges: 45 days if tags on (pol-007).
- Final sale / 50%+ clearance: deny, even inside the window (pol-003).
- Manufacturing defects: 1 year. Under $75 may be approved from description alone (pol-002).
- Transit damage: report within 48 hours and normally needs a photo (pol-005). If value is under $75 and the customer describes a defect, prefer pol-002 and auto-resolve with replacement.
- Wrong item shipped: no time window; send the correct item (pol-006).
Route to escalate when policies conflict, the request is outside the standard window without a clear warranty/defect/wrong-item basis, evidence is truly required and missing, or you are not confident.
Do not invent policies. Confidence must reflect how clearly the facts match the cited policies.`,
    prompt: `Claim JSON:\n${JSON.stringify(claim, null, 2)}\n\nRetrieved policies:\n${policyBlock}`,
  });

  return object;
}

export async function runReviewPipeline(inputClaim) {
  const now = new Date().toISOString();
  const claim = {
    id: inputClaim.id || newId("claim"),
    customer_id: inputClaim.customer_id,
    item_value_usd: Number(inputClaim.item_value_usd),
    days_since_delivery: Number(inputClaim.days_since_delivery),
    prior_claims_90d: Number(inputClaim.prior_claims_90d),
    claim_text: inputClaim.claim_text,
    expected_type: inputClaim.expected_type || null,
    status: "pending",
    created_at: now,
  };

  const { created, claim: stored } = await insertClaim(claim);
  const working = created ? claim : stored;
  if (!created && working.status !== "pending") {
    return { claim: working, skipped: true };
  }

  const hardGate = applyHardGates(working);
  const windowGate = applyWindowGate(working);
  const retrieved = await retrievePolicies(working);
  const llm = await reviewWithAgent(working, retrieved);
  const routed = finalizeRoute({ claim: working, hardGate, windowGate, llm });

  const status = routed.route === "auto" ? "auto_resolved" : "escalated";
  const rationale = [routed.overrideReason, llm.rationale].filter(Boolean).join(" ");
  const cited = Array.from(
    new Set(
      [
        ...(llm.cited_policy_ids || []),
        routed.overridePolicyId,
        ...retrieved.map((policy) => policy.id),
      ].filter(Boolean),
    ),
  ).slice(0, 6);

  const review = {
    id: newId("rev"),
    claim_id: working.id,
    route: routed.route,
    action: routed.action,
    confidence: llm.confidence,
    rationale,
    cited_policy_ids: llm.cited_policy_ids || [],
    missing_evidence: llm.missing_evidence || [],
    customer_message: llm.customer_message,
    retrieved_policy_ids: retrieved.map((policy) => policy.id),
    actor: "agent",
    created_at: new Date().toISOString(),
  };

  await insertReview(review);
  const updated = await updateClaimStatus(working.id, status);

  const citedPolicies = await getPoliciesByIds(cited);

  return {
    claim: updated,
    review,
    retrieved,
    citedPolicies,
    skipped: false,
  };
}

export async function applyHumanDecision(claimId, { action, notes }) {
  const allowed = new Set([
    "approve_refund",
    "approve_exchange",
    "approve_replacement",
    "deny",
    "request_info",
  ]);
  if (!allowed.has(action)) {
    const error = new Error("Invalid human action.");
    error.status = 400;
    throw error;
  }

  const claim = await getClaim(claimId);
  if (!claim) {
    const error = new Error("Claim not found.");
    error.status = 404;
    throw error;
  }
  if (claim.status !== "escalated") {
    const error = new Error("Only escalated inbox claims can be decided by a human.");
    error.status = 409;
    throw error;
  }

  const nextStatus = action === "request_info" ? "escalated" : "human_resolved";
  const review = {
    id: newId("rev"),
    claim_id: claimId,
    route: "escalate",
    action,
    confidence: 1,
    rationale: notes || "Human reviewer decision.",
    cited_policy_ids: [],
    missing_evidence: action === "request_info" ? ["Reviewer requested more information"] : [],
    customer_message: notes || "",
    retrieved_policy_ids: [],
    actor: "human",
    created_at: new Date().toISOString(),
  };

  await insertReview(review);
  const updated = await updateClaimStatus(claimId, nextStatus);
  return { claim: updated, review };
}
