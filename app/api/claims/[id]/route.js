import { NextResponse } from "next/server";
import { getClaim, getReviewsForClaim } from "@/lib/db";
import { getPoliciesByIds, loadPolicies } from "@/lib/policies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const claim = await getClaim(id);
  if (!claim) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }

  const reviews = await getReviewsForClaim(id);
  const policyIds = new Set();
  for (const review of reviews) {
    for (const policyId of review.cited_policy_ids || []) policyIds.add(policyId);
    for (const policyId of review.retrieved_policy_ids || []) policyIds.add(policyId);
  }
  const policies = await getPoliciesByIds([...policyIds]);
  const allPolicies = await loadPolicies();

  return NextResponse.json({
    claim,
    reviews,
    policies,
    policyCatalog: allPolicies,
  });
}
