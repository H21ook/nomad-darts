"use server";

import { cookies } from "next/headers";
import { serverFetcher } from "./fetcher/serverFetcher";
import { redirect } from "next/navigation";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export async function setTokens(access: string, refresh: string) {
  const cookie = await cookies();

  cookie.set(ACCESS_TOKEN_KEY, access, {
    httpOnly: true,
    secure: true,
    path: "/",
    // maxAge: 60 * 15, // 15 min
    maxAge: 60 * 1, // 1 min
  });

  cookie.set(REFRESH_TOKEN_KEY, refresh, {
    httpOnly: true,
    secure: true,
    path: "/",
    // maxAge: 60 * 60 * 24 * 7, // 7 days
    maxAge: 60 * 5, // 5 min
  });
}

export async function clearTokens() {
  const cookie = await cookies();
  cookie.delete(ACCESS_TOKEN_KEY);
  cookie.delete(REFRESH_TOKEN_KEY);
}

export async function getAccessToken() {
  const cookie = await cookies();
  const accessToken = cookie.get(ACCESS_TOKEN_KEY)?.value;
  if (!accessToken) {
    const refreshToken = cookie.get(REFRESH_TOKEN_KEY)?.value;
    if (!refreshToken) {
      redirect("/auth/login");
    }

    const response = await serverFetcher.post<
      {
        accessToken: string;
        refreshToken: string;
      },
      {
        refreshToken: string;
      }
    >("/internal/auth/refresh", {
      refreshToken,
    });

    if (!response.isOk) {
      redirect("/auth/login");
    }

    await setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
  }
  return accessToken;
}

export const getRefreshToken = async () => {
  const cookie = await cookies();
  return cookie.get(REFRESH_TOKEN_KEY)?.value;
}