import { NextResponse } from "next/server";
import { loadPolicies } from "@/lib/policies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const policies = await loadPolicies();
  return NextResponse.json({ policies });
}
