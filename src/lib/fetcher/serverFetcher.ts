import { coreFetcher, CoreFetcherOptions } from "./coreFetcher";

export const serverFetcher = {
  get: <T>(
    url: string,
    token?: string,
    options?: Omit<CoreFetcherOptions, "token">
  ) => coreFetcher<T>("GET", url, undefined, { ...options, token }),

  post: <T, TBody = undefined>(
    url: string,
    data?: TBody,
    token?: string,
    options?: Omit<CoreFetcherOptions, "token">
  ) => coreFetcher<T, TBody>("POST", url, data, { ...options, token }),

  put: <T, TBody = undefined>(
    url: string,
    data?: TBody,
    token?: string,
    options?: Omit<CoreFetcherOptions, "token">
  ) => coreFetcher<T, TBody>("PUT", url, data, { ...options, token }),

  patch: <T, TBody = undefined>(
    url: string,
    data?: TBody,
    token?: string,
    options?: Omit<CoreFetcherOptions, "token">
  ) => coreFetcher<T, TBody>("PATCH", url, data, { ...options, token }),

  delete: <T>(
    url: string,
    token?: string,
    options?: Omit<CoreFetcherOptions, "token">
  ) => coreFetcher<T>("DELETE", url, undefined, { ...options, token }),
};
