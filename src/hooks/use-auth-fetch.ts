import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";

/** Backend base URL — empty locally (Vite proxies), full URL in cloud */
export const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Returns an `authFetch` function that works like fetch() but
 * automatically attaches the Clerk Bearer token to every request
 * and prepends VITE_API_URL for /api paths when deployed.
 */
export function useAuthFetch() {
  const { getToken } = useAuth();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const token = await getToken();
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      // Prepend API_BASE for relative /api paths in production
      let url = input;
      if (typeof input === 'string' && input.startsWith('/api') && API_BASE) {
        url = `${API_BASE}${input}`;
      }

      return fetch(url, { ...init, headers });
    },
    [getToken]
  );

  return authFetch;
}
