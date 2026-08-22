const STORAGE_KEY = "policy-reviewer-store-v1";
const EVENT = "policy-store-updated";

export function emptyClientStore() {
  return { claims: [], reviews: [] };
}

export function loadClientStore() {
  if (typeof window === "undefined") return emptyClientStore();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed) return emptyClientStore();
    return {
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    };
  } catch {
    return emptyClientStore();
  }
}

export function saveClientStore(store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      claims: store.claims || [],
      reviews: store.reviews || [],
    }),
  );
  window.dispatchEvent(new Event(EVENT));
}

export function pickRicherStore(serverStore, localStore) {
  const serverLen = serverStore?.claims?.length || 0;
  const localLen = localStore?.claims?.length || 0;
  if (serverLen >= localLen) {
    return {
      claims: serverStore.claims || [],
      reviews: serverStore.reviews || localStore.reviews || [],
    };
  }
  return localStore;
}

export function mergeClaimIntoStore(store, claim, review) {
  const claims = store.claims.filter((item) => item.id !== claim.id);
  claims.push(claim);
  const reviews = review
    ? [...store.reviews.filter((item) => item.id !== review.id), review]
    : store.reviews;
  return {
    claims: claims.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    reviews,
  };
}

export function applyHumanDecisionLocally(store, claimId, { action, notes, review }) {
  const claim = store.claims.find((item) => item.id === claimId);
  if (!claim) return store;
  const nextStatus = action === "request_info" ? "escalated" : "human_resolved";
  const updatedClaim = { ...claim, status: nextStatus };
  const nextReview =
    review || {
      id: `rev-local-${Date.now().toString(36)}`,
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
  return mergeClaimIntoStore(store, updatedClaim, nextReview);
}

export function countsFromClaims(claims) {
  return {
    total: claims.length,
    pending: claims.filter((c) => c.status === "pending").length,
    auto_resolved: claims.filter((c) => c.status === "auto_resolved").length,
    escalated: claims.filter((c) => c.status === "escalated").length,
    human_resolved: claims.filter((c) => c.status === "human_resolved").length,
  };
}

export function subscribeToClientStore(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(loadClientStore());
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
