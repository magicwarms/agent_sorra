import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

type Props = {
  busy: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export const Composer = ({ busy, disabled, onSend, onStop }: Props) => {
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && draft.trim().length > 0;

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    const border = element.offsetHeight - element.clientHeight;
    element.style.height = `${element.scrollHeight + border}px`;
  }, [draft]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || !canSend) return;
    onSend(draft);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-inner">
        <textarea
          ref={field}
          id="pesan"
          rows={1}
          value={draft}
          placeholder="Tulis pesan…"
          aria-label="Pesan"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {busy ? (
          <button type="button" className="btn btn-stop" onClick={onStop}>
            Berhenti
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={!canSend}>
            Kirim
          </button>
        )}
      </div>
    </form>
  );
};
