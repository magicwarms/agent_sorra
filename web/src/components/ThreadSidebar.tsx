import { forwardRef } from "react";
import type { ThreadsStatus } from "../hooks/useThreads";
import { formatRelativeDate, formatTokens } from "../lib/format";
import type { Thread } from "../types";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  items: Thread[];
  status: ThreadsStatus;
  activeId: string | null;
  hasNextPage: boolean;
  loadingMore: boolean;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onLoadMore: () => void;
  onLogout: () => void;
  onClose: () => void;
};

export const ThreadSidebar = forwardRef<HTMLElement, Props>(
  (
    {
      items,
      status,
      activeId,
      hasNextPage,
      loadingMore,
      open,
      onSelect,
      onNew,
      onLoadMore,
      onLogout,
      onClose,
    },
    ref,
  ) => (
    <>
      {open && (
        <button
          type="button"
          className="scrim"
          aria-label="Tutup daftar percakapan"
          onClick={onClose}
        />
      )}
      <aside
        ref={ref}
        className={open ? "sidebar is-open" : "sidebar"}
        aria-label="Percakapan"
      >
        <div className="sidebar-head">
          <h2>Percakapan</h2>
          <button type="button" className="btn btn-quiet" onClick={onNew}>
            Percakapan baru
          </button>
        </div>
        <nav className="thread-scroll" aria-label="Daftar percakapan">
          {status === "ready" && items.length === 0 && (
            <p className="empty-list">Belum ada percakapan.</p>
          )}
          <ul className="thread-list">
            {items.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  className={
                    thread.id === activeId
                      ? "thread-item is-active"
                      : "thread-item"
                  }
                  aria-current={thread.id === activeId ? "true" : undefined}
                  onClick={() => onSelect(thread.id)}
                >
                  <span className="thread-title">{thread.title}</span>
                  <span className="thread-date">
                    {formatRelativeDate(thread.createdAt)}
                    {thread.totalToken > 0 &&
                      ` · ${formatTokens(thread.totalToken)} token`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hasNextPage && (
            <button
              type="button"
              className="btn btn-quiet load-more"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? "Memuat…" : "Muat lagi"}
            </button>
          )}
        </nav>
        <div className="sidebar-foot">
          <ThemeToggle className="btn btn-ghost" />
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            Keluar
          </button>
        </div>
      </aside>
    </>
  ),
);
