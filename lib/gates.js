const WARRANTY_OR_FULFILLMENT =
  /defect|broke|broken|damaged|warranty|wrong item|wrong color|manufacturing|zipper|shipped the wrong|sent me the wrong/i;

export function applyHardGates(claim) {
  if (Number(claim.item_value_usd) >= 150) {
    return {
      forceEscalate: true,
      policyId: "pol-004",
      reason:
        "Item value is $150 or more. High-value claims must be reviewed by a human (pol-004).",
    };
  }

  if (Number(claim.prior_claims_90d) > 3) {
    return {
      forceEscalate: true,
      policyId: "pol-008",
      reason:
        "Customer has more than 3 claims in 90 days. Repeat-claim pattern requires human review (pol-008).",
    };
  }

  return { forceEscalate: false };
}

export function applyWindowGate(claim) {
  const days = Number(claim.days_since_delivery);
  const text = claim.claim_text || "";
  if (days > 30 && !WARRANTY_OR_FULFILLMENT.test(text)) {
    return {
      forceEscalate: true,
      policyId: "pol-001",
      reason:
        "Claim is outside the standard 30-day return window and is not clearly a warranty, defect, or wrong-item case (pol-001).",
    };
  }
  return { forceEscalate: false };
}

export function finalizeRoute({ claim, hardGate, windowGate, llm }) {
  if (hardGate.forceEscalate) {
    return {
      route: "escalate",
      action: llm?.action === "needs_human" ? "needs_human" : llm?.action || "needs_human",
      overrideReason: hardGate.reason,
      overridePolicyId: hardGate.policyId,
    };
  }

  if (windowGate.forceEscalate) {
    return {
      route: "escalate",
      action: "needs_human",
      overrideReason: windowGate.reason,
      overridePolicyId: windowGate.policyId,
    };
  }

  if (!llm) {
    return {
      route: "escalate",
      action: "needs_human",
      overrideReason: "No model decision available.",
    };
  }

  if (llm.action === "needs_human" || llm.route === "escalate") {
    return { route: "escalate", action: llm.action, overrideReason: null };
  }

  if (Number(llm.confidence) < 0.7) {
    return {
      route: "escalate",
      action: llm.action === "needs_human" ? "needs_human" : llm.action,
      overrideReason: `Model confidence ${llm.confidence} is below the 0.7 auto-resolve threshold.`,
    };
  }

  return { route: "auto", action: llm.action, overrideReason: null };
}

export function expectedRouteForSample(claim) {
  const hardGate = applyHardGates(claim);
  const windowGate = applyWindowGate(claim);
  if (hardGate.forceEscalate || windowGate.forceEscalate) return "escalate";
  return "auto";
}
