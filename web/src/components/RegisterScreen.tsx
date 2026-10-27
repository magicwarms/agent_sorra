import { useState, type FormEvent } from "react";
import {
  ApiError,
  login,
  NETWORK_ERROR,
  register,
  SERVER_ERROR,
} from "../lib/api";
import { setToken } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

const DUPLICATE_ERROR = "Email atau username sudah dipakai.";
const INVALID_ERROR = "Data belum valid. Periksa lagi isianmu.";
const PASSWORD_HINT =
  "Minimal 8 karakter, ada huruf besar, huruf kecil, dan angka.";
const HINT_ID = "register-password-hint";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/;

type Field = "name" | "email" | "username" | "password";
type Values = Record<Field, string>;

// Aturan mengikuti backend (user.dto.ts dan plugin username); yang pertama gagal ditampilkan.
const validate = ({ name, email, username, password }: Values) => {
  if (!name) return { field: "name", message: "Nama wajib diisi." } as const;
  if (!EMAIL_PATTERN.test(email))
    return { field: "email", message: "Format email belum benar." } as const;
  if (username && username.length < 5)
    return {
      field: "username",
      message: "Username minimal 5 karakter.",
    } as const;
  if (password.length < 8 || !PASSWORD_PATTERN.test(password))
    return {
      field: "password",
      message: "Password belum memenuhi syarat.",
    } as const;
  return null;
};

const registerError = (failure: unknown) => {
  if (!(failure instanceof ApiError)) return NETWORK_ERROR;
  if (failure.status === 409) return DUPLICATE_ERROR;
  if (failure.status === 400 || failure.status === 422) return INVALID_ERROR;
  return SERVER_ERROR;
};

type Props = {
  onLoggedIn: () => void;
  onLoginNeeded: (email: string) => void;
  onSwitch: () => void;
};

export const RegisterScreen = ({
  onLoggedIn,
  onLoginNeeded,
  onSwitch,
}: Props) => {
  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    username: "",
    password: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bind = (field: Field) => ({
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const trimmed: Values = {
      name: values.name.trim(),
      email: values.email.trim(),
      username: values.username.trim(),
      password: values.password,
    };
    const invalid = validate(trimmed);
    if (invalid) {
      setError(invalid.message);
      (form.elements.namedItem(invalid.field) as HTMLInputElement | null)?.focus();
      return;
    }

    setPending(true);
    setError(null);
    try {
      await register({
        name: trimmed.name,
        email: trimmed.email,
        password: trimmed.password,
        ...(trimmed.username ? { username: trimmed.username } : {}),
      });
    } catch (failure) {
      setError(registerError(failure));
      setPending(false);
      return;
    }

    // Token dari pendaftaran adalah sesi better-auth, bukan JWT API, jadi masuk ulang.
    try {
      const { token } = await login(trimmed.email, trimmed.password);
      setToken(token);
      onLoggedIn();
    } catch {
      onLoginNeeded(trimmed.email);
    }
  };

  return (
    <main className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <form className="login-form" onSubmit={submit} noValidate>
        <h1>Buat akun Sorra</h1>
        <label className="field">
          <span>Nama</span>
          <input {...bind("name")} autoComplete="name" autoFocus required />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            {...bind("email")}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>
        <label className="field">
          <span>Username (opsional)</span>
          <input
            {...bind("username")}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={100}
          />
        </label>
        <div className="field-group">
          <label className="field">
            <span>Password</span>
            <input
              {...bind("password")}
              type="password"
              autoComplete="new-password"
              aria-describedby={HINT_ID}
              required
            />
          </label>
          <p id={HINT_ID} className="field-hint">
            {PASSWORD_HINT}
          </p>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Mendaftar…" : "Daftar"}
        </button>
        <button type="button" className="link-button" onClick={onSwitch}>
          Sudah punya akun? Masuk
        </button>
      </form>
    </main>
  );
};
