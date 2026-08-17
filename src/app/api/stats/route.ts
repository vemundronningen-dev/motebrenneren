import { NextResponse } from "next/server";
import { getNationalStats } from "@/lib/stats";

export async function GET() {
  const stats = await getNationalStats();
  return NextResponse.json(stats);
}
