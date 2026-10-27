import { useState, type FormEvent } from "react";
import { ApiError, login } from "../lib/api";
import { setToken } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

const CREDENTIAL_ERROR = "Email/username atau password salah.";
const NETWORK_ERROR = "Tidak bisa terhubung ke server.";

export const LoginScreen = ({ onLoggedIn }: { onLoggedIn: () => void }) => {
  const [identifier, setIdentifier] = useState("");
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
      // Backend membalas salah password dengan HTTP 500 ("Invalid username or password").
      setError(failure instanceof ApiError ? CREDENTIAL_ERROR : NETWORK_ERROR);
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
        <label className="field">
          <span>Email atau username</span>
          <input
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
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
      </form>
    </main>
  );
};
