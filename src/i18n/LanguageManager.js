const STORAGE_KEY = "tripledger-language";

const LanguageManager = {
  load() {
    const savedLanguage = localStorage.getItem(STORAGE_KEY);
    return savedLanguage === "ta" ? "ta" : "en";
  },

  save(language) {
    localStorage.setItem(STORAGE_KEY, language);
  },
};

export default LanguageManager;
