import { useEffect, useMemo, useState } from "react";

import LanguageContext from "./LanguageContext";
import LanguageManager from "./LanguageManager";
import { translations } from "./translations";

function interpolate(template, params = {}) {
  if (!template) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] != null ? String(params[key]) : ""
  );
}

function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => LanguageManager.load());

  useEffect(() => {
    LanguageManager.save(language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t(key, params) {
        const template =
          translations[language]?.[key] || translations.en[key] || key;
        return interpolate(template, params);
      },
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export default LanguageProvider;
