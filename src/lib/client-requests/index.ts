import { clientFetcher } from "@/lib/fetcher/clientFetcher";
import { RefreshResponse } from "@/types/auth-types";

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const res = await clientFetcher.get<RefreshResponse>(
                "/internal/auth/refresh"
            );

            if (!res.isOk) {
                return null;
            }

            return res.data.accessToken;
        })()
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}