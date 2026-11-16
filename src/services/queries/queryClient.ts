import { QueryClient } from '@tanstack/react-query';
import { toApiError } from '../api/errors';

/**
 * Un error 4xx no se reintenta: repetir un 404 o un 403 da lo mismo. Los de red
 * o 5xx, una vez.
 */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  const { status } = toApiError(error);
  if (status !== null && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});
