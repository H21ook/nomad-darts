import { NextResponse } from "next/server";
import { getRefreshToken, setTokens } from "@/lib/tokens";

export async function POST() {
  //   let res: { accessToken: string; refreshToken: string } | { error?: string };

  const refreshTokenStore = await getRefreshToken();

  if (!refreshTokenStore) {
    return NextResponse.json(
      { error: "Refresh token not found" },
      { status: 401 }
    );
  }

  const res = {
    accessToken: `access_token_${Date.now()}`,
    refreshToken: "refresh_token",
  };

  //   const res = await fetch(process.env.AUTH_URL + "/refresh", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //   });

  // if (!res.ok)
  //   return NextResponse.json({ error: "Refresh failed" }, { status: 401 });

  const { accessToken, refreshToken } = res;
  await setTokens(accessToken, refreshToken);

  return NextResponse.json({ accessToken });
}
