import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { loadPolicies, policyEmbedText } from "./policies.js";

const EMBEDDINGS_PATH = path.join(process.cwd(), "data", "embeddings.json");
const TOP_K = 4;

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not set. Add it to .env.local.");
    error.status = 500;
    throw error;
  }
}

async function loadCachedEmbeddings() {
  try {
    const raw = await readFile(EMBEDDINGS_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function saveCachedEmbeddings(payload) {
  await mkdir(path.dirname(EMBEDDINGS_PATH), { recursive: true });
  await writeFile(EMBEDDINGS_PATH, JSON.stringify(payload), "utf8");
}

let memoryIndex = null;

export async function getPolicyIndex() {
  if (memoryIndex) return memoryIndex;

  const policies = await loadPolicies();
  const cached = await loadCachedEmbeddings();
  const policySignature = policies.map((p) => p.id).join(",");

  if (cached && cached.signature === policySignature && Array.isArray(cached.items)) {
    memoryIndex = cached.items.map((item) => ({
      ...item,
      policy: policies.find((policy) => policy.id === item.id),
    }));
    return memoryIndex;
  }

  requireApiKey();
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: policies.map(policyEmbedText),
  });

  const items = policies.map((policy, index) => ({
    id: policy.id,
    embedding: embeddings[index],
    policy,
  }));

  await saveCachedEmbeddings({
    signature: policySignature,
    items: items.map(({ id, embedding }) => ({ id, embedding })),
  });

  memoryIndex = items;
  return memoryIndex;
}

export function buildRetrievalQuery(claim) {
  return [
    claim.claim_text,
    `Item value USD: ${claim.item_value_usd}`,
    `Days since delivery: ${claim.days_since_delivery}`,
    `Prior claims in 90 days: ${claim.prior_claims_90d}`,
  ].join("\n");
}

export async function retrievePolicies(claim, k = TOP_K) {
  requireApiKey();
  const index = await getPolicyIndex();
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: [buildRetrievalQuery(claim)],
  });
  const queryEmbedding = embeddings[0];

  return index
    .map((item) => ({
      ...item.policy,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
