import { useCallback, useEffect, useRef, useState } from "react";
import { listThreads } from "../lib/api";
import type { Thread } from "../types";

const PER_PAGE = 20;

export type ThreadsStatus = "loading" | "ready" | "error";

const mergeThreads = (current: Thread[], incoming: Thread[]) => {
  const known = new Set(current.map((thread) => thread.id));
  return [...current, ...incoming.filter((thread) => !known.has(thread.id))];
};

export const useThreads = () => {
  const [items, setItems] = useState<Thread[]>([]);
  const [status, setStatus] = useState<ThreadsStatus>("loading");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    listThreads(1, PER_PAGE)
      .then(({ threads, meta }) => {
        if (cancelled) return;
        pageRef.current = 1;
        setItems((current) => mergeThreads(current, threads));
        setHasNextPage(meta.hasNextPage);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const { threads, meta } = await listThreads(
        pageRef.current + 1,
        PER_PAGE,
      );
      pageRef.current += 1;
      setItems((current) => mergeThreads(current, threads));
      setHasNextPage(meta.hasNextPage);
    } catch {
      // tombol "Muat lagi" tetap ada supaya bisa dicoba ulang
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const prepend = useCallback(
    (thread: { threadId: string; title: string }) =>
      setItems((current) => [
        {
          id: thread.threadId,
          title: thread.title,
          totalToken: 0,
          createdAt: new Date().toISOString(),
        },
        ...current.filter((item) => item.id !== thread.threadId),
      ]),
    [],
  );

  return { items, status, hasNextPage, loadingMore, loadMore, prepend };
};
