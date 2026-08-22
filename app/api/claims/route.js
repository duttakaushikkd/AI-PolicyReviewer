import { NextResponse } from "next/server";
import { counts, listClaims, newId } from "@/lib/db";
import { runReviewPipeline } from "@/lib/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const [claims, summary] = await Promise.all([listClaims(status), counts()]);
  return NextResponse.json({ claims, counts: summary });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.claim_text || body.item_value_usd === undefined) {
      return NextResponse.json(
        { error: "claim_text and item_value_usd are required." },
        { status: 400 },
      );
    }

    const result = await runReviewPipeline({
      id: newId("claim"),
      customer_id: body.customer_id || "CUST-NEW",
      item_value_usd: body.item_value_usd,
      days_since_delivery: body.days_since_delivery ?? 0,
      prior_claims_90d: body.prior_claims_90d ?? 0,
      claim_text: body.claim_text,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to review claim." },
      { status: error.status || 500 },
    );
  }
}
