import { NextResponse } from "next/server";
import { applyHumanDecision } from "@/lib/review-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await applyHumanDecision(id, {
      action: body.action,
      notes: body.notes || "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save decision." },
      { status: error.status || 400 },
    );
  }
}
