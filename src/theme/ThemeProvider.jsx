import { useEffect, useMemo, useState } from "react";

import ThemeContext from "./ThemeContext";
import ThemeManager from "./ThemeManager";
import { lightTheme, darkTheme } from "./themes";

function ThemeProvider({ children }) {
  const saved = ThemeManager.load();

  const [settings, setSettings] = useState(
    saved || {
      mode: "light",
      accent: "#007AFF",
    }
  );

  const theme =
    settings.mode === "dark"
      ? darkTheme
      : lightTheme;

  useEffect(() => {
    ThemeManager.save(settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;

    Object.entries(theme.colors).forEach(
      ([key, value]) => {
        root.style.setProperty(
          `--color-${key}`,
          key === "primary" ? settings.accent : value
        );
      }
    );

    root.dataset.theme = settings.mode;

    Object.entries(theme.tokens.radius).forEach(
      ([key, value]) => {
        root.style.setProperty(
          `--radius-${key}`,
          value
        );
      }
    );

    Object.entries(theme.tokens.spacing).forEach(
      ([key, value]) => {
        root.style.setProperty(
          `--space-${key}`,
          value
        );
      }
    );

    Object.entries(theme.tokens.shadow).forEach(
      ([key, value]) => {
        root.style.setProperty(
          `--shadow-${key}`,
          value
        );
      }
    );

    Object.entries(theme.tokens.layout).forEach(
      ([key, value]) => {
        root.style.setProperty(
          `--layout-${key}`,
          value
        );
      }
    );

    Object.entries(theme.tokens.animation).forEach(
      ([key, value]) => {
        root.style.setProperty(
          `--animation-${key}`,
          value
        );
      }
    );
  }, [theme, settings]);

  const value = useMemo(
    () => ({
      settings,

      setSettings,

      toggleTheme() {
        setSettings((prev) => ({
          ...prev,
          mode:
            prev.mode === "light"
              ? "dark"
              : "light",
        }));
      },

      setAccent(color) {
        setSettings((prev) => ({
          ...prev,
          accent: color,
        }));
      },
    }),
    [settings]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
