import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

const emptyStore = () => ({ claims: [], reviews: [] });

async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return emptyStore();
    throw error;
  }
}

async function writeStore(store) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listClaims(status) {
  const store = await readStore();
  const claims = status
    ? store.claims.filter((claim) => claim.status === status)
    : store.claims;
  return claims.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getClaim(id) {
  const store = await readStore();
  return store.claims.find((claim) => claim.id === id) ?? null;
}

export async function getReviewsForClaim(claimId) {
  const store = await readStore();
  return store.reviews
    .filter((review) => review.claim_id === claimId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function insertClaim(claim) {
  const store = await readStore();
  if (store.claims.some((existing) => existing.id === claim.id)) {
    return { created: false, claim: store.claims.find((c) => c.id === claim.id) };
  }
  store.claims.push(claim);
  await writeStore(store);
  return { created: true, claim };
}

export async function updateClaimStatus(id, status) {
  const store = await readStore();
  const claim = store.claims.find((item) => item.id === id);
  if (!claim) return null;
  claim.status = status;
  await writeStore(store);
  return claim;
}

export async function insertReview(review) {
  const store = await readStore();
  store.reviews.push(review);
  await writeStore(store);
  return review;
}

export async function counts() {
  const store = await readStore();
  return {
    total: store.claims.length,
    pending: store.claims.filter((c) => c.status === "pending").length,
    auto_resolved: store.claims.filter((c) => c.status === "auto_resolved").length,
    escalated: store.claims.filter((c) => c.status === "escalated").length,
    human_resolved: store.claims.filter((c) => c.status === "human_resolved").length,
  };
}

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
