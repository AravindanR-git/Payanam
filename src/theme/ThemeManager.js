const STORAGE_KEY = "tripledger-theme";

const ThemeManager = {
  save(theme) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(theme)
    );
  },

  load() {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

export default ThemeManager;