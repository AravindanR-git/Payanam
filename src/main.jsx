import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

import ThemeProvider from "./theme/ThemeProvider";

import "./styles/variables.css";
import "./styles/globals.css";
import "./styles/layout.css";
import "./styles/typography.css";
import "./styles/animations.css";
import "./styles/utilities.css";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);