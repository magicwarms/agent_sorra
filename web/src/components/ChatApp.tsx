import { useCallback, useEffect, useRef, useState } from "react";
import { useAgentChat } from "../hooks/useAgentChat";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useThreads } from "../hooks/useThreads";
import { formatTokens } from "../lib/format";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ThreadSidebar } from "./ThreadSidebar";
import { TodoPanel } from "./TodoPanel";

const THREAD_PARAM = "thread";

const readThreadParam = () =>
  new URLSearchParams(window.location.search).get(THREAD_PARAM);

const writeThreadParam = (threadId: string | null) => {
  const url = new URL(window.location.href);
  if (threadId) url.searchParams.set(THREAD_PARAM, threadId);
  else url.searchParams.delete(THREAD_PARAM);
  window.history.replaceState(null, "", url);
};

export const ChatApp = ({ onLogout }: { onLogout: () => void }) => {
  const threads = useThreads();
  const { prepend, addTokens } = threads;
  const chat = useAgentChat({
    onThread: (thread) => {
      if (thread.isNew) prepend(thread);
    },
    onDone: ({ threadId, usage }) => addTokens(threadId, usage.totalTokens),
  });
  const { load, reset } = chat;

  const [initialThread] = useState(readThreadParam);
  const [drawerRequested, setDrawerOpen] = useState(false);
  const drawerMode = useMediaQuery("(max-width: 899px)");
  const drawerOpen = drawerRequested && drawerMode;
  const railMode = useMediaQuery("(min-width: 1100px)");
  const sidebar = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (initialThread) void load(initialThread);
  }, [initialThread, load]);

  useEffect(() => {
    writeThreadParam(chat.threadId);
  }, [chat.threadId]);

  useEffect(() => {
    if (drawerOpen) {
      sidebar.current?.querySelector<HTMLElement>("button")?.focus();
    } else if (wasOpen.current) {
      opener.current?.focus();
    }
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const selectThread = useCallback(
    (id: string) => {
      setDrawerOpen(false);
      if (id !== chat.threadId) void load(id);
    },
    [chat.threadId, load],
  );

  const newChat = useCallback(() => {
    setDrawerOpen(false);
    reset();
  }, [reset]);

  const logout = useCallback(() => {
    writeThreadParam(null);
    onLogout();
  }, [onLogout]);

  const busy = chat.status === "preparing" || chat.status === "streaming";
  const hasTodos = chat.todos.length > 0;
  const heading = chat.title ?? "Percakapan baru";

  return (
    <div className="app">
      <button
        type="button"
        className="btn btn-primary skip-link"
        onClick={() => document.getElementById("pesan")?.focus()}
      >
        Lompat ke kolom pesan
      </button>
      <ThreadSidebar
        ref={sidebar}
        items={threads.items}
        status={threads.status}
        activeId={chat.threadId}
        hasNextPage={threads.hasNextPage}
        loadingMore={threads.loadingMore}
        open={drawerOpen}
        onSelect={selectThread}
        onNew={newChat}
        onLoadMore={threads.loadMore}
        onLogout={logout}
        onClose={() => setDrawerOpen(false)}
      />
      <main className="main" inert={drawerOpen}>
        <header className="topbar">
          <button
            ref={opener}
            type="button"
            className="btn btn-quiet"
            onClick={() => setDrawerOpen(true)}
          >
            Percakapan
          </button>
          <h1 className="topbar-title">{heading}</h1>
          {chat.threadId && chat.totalToken > 0 && (
            <span className="topbar-usage">
              {formatTokens(chat.totalToken)} token
            </span>
          )}
        </header>
        <MessageList
          key={chat.epoch}
          messages={chat.messages}
          status={chat.status}
          pendingBreak={chat.pendingBreak}
          stoppedId={chat.stoppedId}
          error={chat.error}
          onRetry={chat.retry}
        />
        {hasTodos && !railMode && (
          <TodoPanel todos={chat.todos} variant="strip" />
        )}
        <Composer
          busy={busy}
          disabled={chat.status === "loading"}
          onSend={chat.send}
          onStop={chat.stop}
        />
      </main>
      {hasTodos && railMode && (
        <div className="rail-slot" inert={drawerOpen}>
          <TodoPanel todos={chat.todos} variant="rail" />
        </div>
      )}
    </div>
  );
};
