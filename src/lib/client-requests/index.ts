import { coreFetcher } from "@/lib/fetcher/coreFetcher";
import { RefreshResponse } from "@/types/auth-types";

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            // POST: /internal/auth/refresh only exports POST (405 otherwise).
            // Use coreFetcher directly (not clientFetcher.post) so a 401 from
            // the refresh endpoint returns null instead of re-entering
            // refreshAccessToken through clientFetcher's withRefresh retry.
            const res = await coreFetcher<RefreshResponse>(
                "POST",
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