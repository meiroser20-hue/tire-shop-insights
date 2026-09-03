import { useQuery } from "@tanstack/react-query";
import { fetchRows, previousRange, rangeFor, type Row, type TimeKey } from "./data";

export function useView(view: string, key: TimeKey | null, opts: { limit?: number } = {}) {
  return useQuery<Row[]>({
    queryKey: ["view", view, key, opts.limit ?? 2000],
    queryFn: () => fetchRows(view, { range: key ? rangeFor(key) : null, limit: opts.limit ?? 2000 }),
    staleTime: 60_000,
    retry: 1,
  });
}

export function usePrevView(view: string, key: TimeKey) {
  return useQuery<Row[]>({
    queryKey: ["view-prev", view, key],
    queryFn: () => fetchRows(view, { range: previousRange(key) }),
    staleTime: 60_000,
    retry: 1,
  });
}
