import { updateSession } from "@/lib/supabase/proxy"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
    // Guard: if Supabase env vars are missing (e.g. local dev without .env),
    // skip session handling gracefully instead of crashing in createServerClient.
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
        return NextResponse.next()
    }

    return await updateSession(request)
}

export const config = {
    matcher: ["/dashboard/:path*", "/match/:path*"],
}
