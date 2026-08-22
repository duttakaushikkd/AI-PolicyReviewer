import { readFile } from "node:fs/promises";
import path from "node:path";

let cache = null;

export async function loadPolicies() {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "data", "return_policy_kb.json");
  const raw = await readFile(filePath, "utf8");
  cache = JSON.parse(raw);
  return cache;
}

export async function getPoliciesByIds(ids) {
  const policies = await loadPolicies();
  const wanted = new Set(ids);
  return policies.filter((policy) => wanted.has(policy.id));
}

export function policyEmbedText(policy) {
  return `${policy.title}\nCategory: ${policy.category}\nTag: ${policy.confidence_tag}\n${policy.policy_text}`;
}
