import { NextResponse } from "next/server";
import { setTokens } from "@/lib/tokens";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  let res: {
    accessToken: string;
    refreshToken: string;
  } | {
    error?: string,
  };
  // --- backend рүү хүсэлт илгээх ---
  //   const res = await fetch(process.env.AUTH_URL + "/login", {
  //     method: "POST",
  //     body: JSON.stringify({ email, password }),
  //     headers: { "Content-Type": "application/json" },
  //   });

  if (email === "khishigbayar.u@gmail.com" && password === "Test@123") {
    res = {
      accessToken: `access_token_${Date.now()}`,
      refreshToken: "refresh_token",
    };

    const { accessToken, refreshToken } = res;

    await setTokens(accessToken, refreshToken);

    return NextResponse.json({ accessToken });
  }


  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
