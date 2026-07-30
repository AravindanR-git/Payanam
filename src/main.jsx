import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

import ThemeProvider from "./theme/ThemeProvider";
import LanguageProvider from "./i18n/LanguageProvider";

import "./styles/variables.css";
import "./styles/globals.css";
import "./styles/layout.css";
import "./styles/typography.css";
import "./styles/animations.css";
import "./styles/utilities.css";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>
);
