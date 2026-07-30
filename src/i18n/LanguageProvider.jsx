import { useEffect, useMemo, useState } from "react";

import LanguageContext from "./LanguageContext";
import LanguageManager from "./LanguageManager";
import { translations } from "./translations";

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
      t(key) {
        return translations[language][key] || translations.en[key] || key;
      },
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export default LanguageProvider;
