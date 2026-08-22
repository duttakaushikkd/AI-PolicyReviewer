import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getStoreSnapshot } from "@/lib/db";
import { runReviewPipeline } from "@/lib/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), "customer_data", "sample_claims.json");
    const samples = JSON.parse(await readFile(filePath, "utf8"));
    const results = [];

    for (const sample of samples) {
      const result = await runReviewPipeline(sample);
      results.push({
        id: result.claim.id,
        status: result.claim.status,
        skipped: result.skipped,
        route: result.review?.route ?? null,
        action: result.review?.action ?? null,
        expected_type: sample.expected_type,
      });
    }

    const snapshot = await getStoreSnapshot();
    return NextResponse.json({ results, ...snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to seed claims." },
      { status: error.status || 500 },
    );
  }
}
