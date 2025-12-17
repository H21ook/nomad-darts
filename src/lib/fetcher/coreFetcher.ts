import { CustomResponse } from "@/types";

export interface CoreFetcherOptions {
  token?: string;
  customHeaders?: Record<string, string>;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function coreFetcher<T, TBody = undefined>(
  method: HttpMethod,
  endpoint: string,
  body?: TBody,
  options: CoreFetcherOptions = {}
): Promise<CustomResponse<T>> {
  try {
    const { token, customHeaders } = options;

    const url = new URL(endpoint, process.env.NEXT_PUBLIC_API_URL);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(customHeaders ?? {}),
    };

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const status = res.status;

    if (!res.ok) {
      let error: string | undefined;
      try {
        const json = await res.json();
        error = json?.error;
      } catch { }

      return {
        isOk: false,
        status,
        error: error ?? `HTTP ${status}`,
      };
    }

    const json = await res.json();

    return { isOk: true, data: json };
  } catch (error: unknown) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      isOk: false,
      error: errorMessage,
      status: 500
    };
  }
}
