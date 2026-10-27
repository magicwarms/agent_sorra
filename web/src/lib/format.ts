import type { UiMessage, UiToolCall } from "../types";

const relative = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
const absolute = new Intl.DateTimeFormat("id", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatRelativeDate = (iso: string, now = Date.now()): string => {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diff = time - now;
  const age = Math.abs(diff);
  if (age < MINUTE) return "Baru saja";
  if (age < HOUR) return relative.format(Math.round(diff / MINUTE), "minute");
  if (age < DAY) return relative.format(Math.round(diff / HOUR), "hour");
  if (age < 7 * DAY) return relative.format(Math.round(diff / DAY), "day");
  return absolute.format(time);
};

type AssistantMessage = Extract<UiMessage, { role: "assistant" }>;

export const failRunningTools = (toolCalls: UiToolCall[]): UiToolCall[] =>
  toolCalls.some((toolCall) => toolCall.status === "running")
    ? toolCalls.map((toolCall) =>
        toolCall.status === "running"
          ? { ...toolCall, status: "error" }
          : toolCall,
      )
    : toolCalls;

// Riwayat memisahkan AIMessage pemanggil tool dan AIMessage jawaban akhir.
// Stream live menyusun satu blok per giliran, jadi riwayat digabung dengan cara yang sama.
export const groupAssistantRuns = (messages: UiMessage[]): UiMessage[] => {
  const grouped: UiMessage[] = [];
  for (const message of messages) {
    const previous = grouped[grouped.length - 1];
    if (message.role === "assistant" && previous?.role === "assistant") {
      const merged: AssistantMessage = {
        ...previous,
        text: [previous.text, message.text].filter(Boolean).join("\n\n"),
        toolCalls: [...previous.toolCalls, ...message.toolCalls],
      };
      grouped[grouped.length - 1] = merged;
    } else {
      grouped.push(message);
    }
  }
  return grouped.map((message) =>
    message.role === "assistant"
      ? { ...message, toolCalls: failRunningTools(message.toolCalls) }
      : message,
  );
};
