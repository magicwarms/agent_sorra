import { useState, type FormEvent } from "react";
import { ApiError, login, NETWORK_ERROR, SERVER_ERROR } from "../lib/api";
import { setToken } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

const CREDENTIAL_ERROR = "Email/username atau password salah.";

const loginError = (failure: unknown) => {
  if (!(failure instanceof ApiError)) return NETWORK_ERROR;
  return failure.status === 401 || failure.status === 400
    ? CREDENTIAL_ERROR
    : SERVER_ERROR;
};

type Props = {
  onLoggedIn: () => void;
  onSwitch: () => void;
  initialIdentifier?: string;
  notice?: string;
  autoFocus?: boolean;
};

export const LoginScreen = ({
  onLoggedIn,
  onSwitch,
  initialIdentifier = "",
  notice,
  autoFocus = false,
}: Props) => {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { token } = await login(identifier.trim(), password);
      setToken(token);
      onLoggedIn();
    } catch (failure) {
      setError(loginError(failure));
      setPending(false);
    }
  };

  return (
    <main className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <form className="login-form" onSubmit={submit}>
        <h1>Masuk ke Sorra</h1>
        {notice && (
          <p className="form-note" role="status">
            {notice}
          </p>
        )}
        <label className="field">
          <span>Email atau username</span>
          <input
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={autoFocus && !initialIdentifier}
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus={autoFocus && !!initialIdentifier}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Masuk…" : "Masuk"}
        </button>
        <button type="button" className="link-button" onClick={onSwitch}>
          Belum punya akun? Daftar
        </button>
      </form>
    </main>
  );
};
