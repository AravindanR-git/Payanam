import tokens from "./tokens";

export const lightTheme = {
  name: "light",

  colors: {
    primary: "#2563EB",
    primaryHover: "#1D4ED8",

    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#DC2626",

    background: "#F5F7FB",
    surface: "#FFFFFF",
    surfaceSecondary: "#F8FAFC",

    text: "#111827",
    textSecondary: "#6B7280",

    border: "#E5E7EB",

    inputBackground: "#FFFFFF",

    overlay: "rgba(15,23,42,.45)",

    shadow: "rgba(15,23,42,.08)",
  },

  tokens,
};

export const darkTheme = {
  name: "dark",

  colors: {
    primary: "#3B82F6",
    primaryHover: "#60A5FA",

    success: "#22C55E",
    warning: "#FBBF24",
    danger: "#EF4444",

    background: "#0F172A",
    surface: "#1E293B",
    surfaceSecondary: "#293548",

    text: "#F8FAFC",
    textSecondary: "#CBD5E1",

    border: "#334155",

    inputBackground: "#1E293B",

    overlay: "rgba(0,0,0,.65)",

    shadow: "rgba(0,0,0,.35)",
  },

  tokens,
};