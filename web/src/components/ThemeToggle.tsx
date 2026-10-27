import { useEffect, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

const THEME_KEY = "sorra.theme";

type Theme = "light" | "dark";

const readStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
};

export const ThemeToggle = ({ className = "btn btn-quiet" }: { className?: string }) => {
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [chosen, setChosen] = useState<Theme | null>(readStoredTheme);
  const theme: Theme = chosen ?? (systemDark ? "dark" : "light");

  useEffect(() => {
    if (chosen) document.documentElement.dataset.theme = chosen;
  }, [chosen]);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setChosen(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // pilihan tema hanya berlaku untuk sesi ini
    }
  };

  return (
    <button type="button" className={className} onClick={toggle}>
      {theme === "dark" ? "Mode terang" : "Mode gelap"}
    </button>
  );
};
