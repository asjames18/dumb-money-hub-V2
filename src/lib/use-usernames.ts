import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Batch-resolve leaderboard display names for wallet addresses.
 * Returns { "<lowercase-address>": "<name>" } — unknown addresses are absent.
 * One cached query per distinct address set; failures resolve to {}.
 */
export function useUsernames(addresses: string[]): Record<string, string> {
  const key = useMemo(() => {
    const uniq = [...new Set(addresses.map((a) => a.toLowerCase()))].sort();
    return uniq.join(",");
  }, [addresses]);
  const { data } = useQuery({
    queryKey: ["usernames", key],
    queryFn: async () => {
      if (!key) return {} as Record<string, string>;
      const res = await fetch(`/api/username?addresses=${encodeURIComponent(key)}`);
      if (!res.ok) return {} as Record<string, string>;
      return (await res.json()) as Record<string, string>;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return data ?? {};
}
