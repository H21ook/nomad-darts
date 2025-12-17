import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/tokens";

export async function POST() {
  await clearTokens();
  return NextResponse.json({ success: true });
}
