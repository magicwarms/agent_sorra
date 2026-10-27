import type { Thread, ThreadHistory, ThreadMeta, User } from "../types";
import { clearToken, getToken } from "./auth";

const PATHS = {
  login: "/v1/users/login",
  threads: "/v1/threads",
  threadMessages: (id: string) =>
    `/v1/threads/${encodeURIComponent(id)}/messages`,
  stream: "/v1/gateway/stream",
} as const;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Envelope<T> = { success: boolean; data: T; message: unknown };

const messageOf = (body: unknown, fallback: string): string => {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  const nested = (message as { message?: unknown } | null)?.message;
  return typeof nested === "string" ? nested : fallback;
};

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleUnauthorized = () => {
  clearToken();
  window.location.reload();
};

type RequestOptions = RequestInit & { auth?: boolean };

const request = async <T>(
  path: string,
  { auth = true, headers, ...init }: RequestOptions = {},
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
      ...headers,
    },
  });
  if (response.status === 401 && auth) {
    handleUnauthorized();
    throw new ApiError(401, "Sesi berakhir.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageOf(body, response.statusText || "Permintaan gagal."),
    );
  }
  return (body as Envelope<T>).data;
};

export const login = (identifier: string, password: string) =>
  request<{ token: string; user: User }>(PATHS.login, {
    method: "POST",
    auth: false,
    body: JSON.stringify(
      identifier.includes("@")
        ? { email: identifier, password }
        : { username: identifier, password },
    ),
  });

export const listThreads = async (
  page: number,
  perPage = 20,
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  });
  const data = await request<{
    threads: { threads: Thread[]; meta: ThreadMeta };
  }>(`${PATHS.threads}?${query}`, { signal });
  return data.threads;
};

export const getThreadMessages = (id: string, signal?: AbortSignal) =>
  request<ThreadHistory>(PATHS.threadMessages(id), { signal });

export const streamChat = async (
  body: { message: string; threadId?: string },
  signal: AbortSignal,
): Promise<Response> => {
  const response = await fetch(PATHS.stream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, "Sesi berakhir.");
  }
  if (!response.ok) {
    const failure: unknown = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      messageOf(failure, response.statusText || "Permintaan gagal."),
    );
  }
  return response;
};
