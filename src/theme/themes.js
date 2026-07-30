import tokens from "./tokens";

export const lightTheme = {
  name: "light",

  colors: {
    primary: "#007AFF",
    primaryHover: "#0066D6",

    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#DC2626",

    background: "#F2F2F7",
    surface: "#FFFFFF",
    surfaceSecondary: "#F2F2F7",

    text: "#1C1C1E",
    textSecondary: "#6C6C70",

    border: "#E5E5EA",

    inputBackground: "#FFFFFF",

    overlay: "rgba(15,23,42,.45)",

    shadow: "rgba(15,23,42,.08)",
  },

  tokens,
};

export const darkTheme = {
  name: "dark",

  colors: {
    primary: "#0A84FF",
    primaryHover: "#409CFF",

    success: "#22C55E",
    warning: "#FBBF24",
    danger: "#EF4444",

    background: "#000000",
    surface: "#1C1C1E",
    surfaceSecondary: "#2C2C2E",

    text: "#F5F5F7",
    textSecondary: "#AEAEB2",

    border: "#38383A",

    inputBackground: "#1E293B",

    overlay: "rgba(0,0,0,.65)",

    shadow: "rgba(0,0,0,.35)",
  },

  tokens,
};
